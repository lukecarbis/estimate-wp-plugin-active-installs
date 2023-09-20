export function onRequest(context) {
    return handleRequest(context.request);
}

const fetchData = async (endpoint) => {
    const response = await fetch(endpoint);
    if (!response.ok) {
        throw new Error("Network response was not ok");
    }
    return await response.json();
};

const handleRequest = async (request) => {
    const url = new URL(request.url);
    const { searchParams } = url;
    const slug = searchParams.get('slug') || 'hello-dolly';

    try {
        const downloadsData = await fetchData(`https://api.wordpress.org/stats/plugin/1.0/downloads.php?slug=${slug}`);
        const versionsData = await fetchData(`https://api.wordpress.org/stats/plugin/1.0/?slug=${slug}`);

        const getLatestVersionPercentage = (apiResult) => {
            // Extract version keys and sort them.
            let versions = Object.keys(apiResult).filter(v => v !== 'other').sort((a, b) => parseFloat(a) - parseFloat(b));

            // Get the latest version number.
            let latestVersion = versions[versions.length - 1];

            // Return the percentage of the latest version.
            return apiResult[latestVersion];
        }

        const getLatestPeakDownloads = (apiResult) => {
            const data = {};
            for (const key in apiResult) {
                data[key] = parseInt(apiResult[key], 10);
            }

            // Calculate the rough average
            let sum = 0;
            for (const key in data) {
                sum += data[key];
            }
            let roughAverage = sum / Object.keys(data).length;

            // Exclude potential peaks and recalculate the average
            let filteredValues = [];
            for (const key in data) {
                if (data[key] < roughAverage * 3) {
                    filteredValues.push(data[key]);
                }
            }
            let trueAverage = filteredValues.reduce((a, b) => a + b) / filteredValues.length;

            // Identify peaks
            const isPeak = (value) => value > trueAverage * 3;

            // Normalize data
            let normalizedData = { ...data };
            let dates = Object.keys(data);
            let latestPeakValue = 0;

            for (let i = 1; i < dates.length - 1; i++) {
                if (isPeak(data[dates[i]]) && isPeak(data[dates[i + 1]])) {
                    let surroundingValues = [];

                    for (let j = i - 1; j >= 0 && surroundingValues.length < 2; j--) {
                        if (!isPeak(data[dates[j]])) {
                            surroundingValues.push(data[dates[j]]);
                        }
                    }

                    for (let j = i + 2; j < dates.length && surroundingValues.length < 4; j++) {
                        if (!isPeak(data[dates[j]])) {
                            surroundingValues.push(data[dates[j]]);
                        }
                    }

                    surroundingValues.sort((a, b) => a - b);
                    let median = surroundingValues.length % 2 === 0 ?
                        Math.floor((surroundingValues[surroundingValues.length / 2 - 1] + surroundingValues[surroundingValues.length / 2]) / 2 ) :
                        surroundingValues[Math.floor(surroundingValues.length / 2)];

                    latestPeakValue = data[dates[i]] + data[dates[i+1]] - 2 * median;

                    normalizedData[dates[i]] = median;
                    normalizedData[dates[i + 1]] = median;
                }
            }

            return latestPeakValue;
        }

        const latestPeakDownloads = getLatestPeakDownloads(downloadsData);
        const latestVersionPercentage = getLatestVersionPercentage(versionsData);
        const estimatedTotalUsers = Math.floor(latestPeakDownloads / (latestVersionPercentage / 100));

        return new Response(JSON.stringify({
            latestPeakDownloads: latestPeakDownloads,
            latestVersionPercentage: latestVersionPercentage,
            estimatedTotalUsers: estimatedTotalUsers,
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(error.message, { status: 500 });
    }
}