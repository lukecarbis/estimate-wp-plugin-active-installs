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
        const pluginData = await fetchData(`https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&slug=${slug}`);
        const downloadsData = await fetchData(`https://api.wordpress.org/stats/plugin/1.0/downloads.php?slug=${slug}`);
        const versionsData = await fetchData(`https://api.wordpress.org/stats/plugin/1.0/?slug=${slug}`);

        const getReportedInstalls = (apiResult) => {
            return apiResult['active_installs'];
        }

        const getLatestVersionPercentage = (apiResult) => {
            // Extract version keys and sort them using localeCompare.
            let versions = Object.keys(apiResult)
                .filter(v => v !== 'other')
                .sort(
                    (a, b) => a.localeCompare(
                        b,
                        undefined,
                        { numeric: true, sensitivity: 'base' }
                    )
                );

            // Get the latest version number.
            let latestVersion = versions[versions.length - 1];

            // Return the percentage of the latest version.
            return apiResult[latestVersion];
        }

        const getNormalizedDownloads = (apiResult) => {
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
            let peakValueDate = '';
            let mostRecentPeakIndex = -1;

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
                    peakValueDate = dates[i];
                    mostRecentPeakIndex = i;

                    normalizedData[dates[i]] = median;
                    normalizedData[dates[i + 1]] = median;
                }
            }

            let sumAfterPeak = 0;
            for (let i = mostRecentPeakIndex + 2; i < dates.length; i++) {
                sumAfterPeak += normalizedData[dates[i]];
            }

            return {
                "downloads": apiResult,
                peakValueDate,
                latestPeakValue,
                normalizedData,
                sumAfterPeak
            };
        }

        const normalizedDownloads = getNormalizedDownloads(downloadsData);
        const latestVersionPercentage = getLatestVersionPercentage(versionsData);
        const reportedInstalls = getReportedInstalls(pluginData);
        const estimatedInstalls = Math.floor((normalizedDownloads.latestPeakValue + normalizedDownloads.sumAfterPeak) / (latestVersionPercentage / 100));

        return new Response(JSON.stringify({
            normalizedDownloads: normalizedDownloads,
            latestVersionPercentage: latestVersionPercentage,
            reportedInstalls: reportedInstalls,
            estimatedInstalls: estimatedInstalls,
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(error.message, { status: 500 });
    }
}