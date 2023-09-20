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
    const slug = searchParams.get('slug').toLowerCase() || 'hello-dolly';

    try {
        const pluginData = await fetchData(`https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&slug=${slug}`);
        const downloadsData = await fetchData(`https://api.wordpress.org/stats/plugin/1.0/downloads.php?slug=${slug}`);
        const versionsData = await fetchData(`https://api.wordpress.org/stats/plugin/1.0/?slug=${slug}`);

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

        const getLatestVersionDownloads = (apiResult, lastUpdated) => {
            let sum = 0;

            for (let date in apiResult) {
                if (date >= lastUpdated) {
                    sum += parseInt(apiResult[date], 10);
                }
            }

            return sum;
        }

        const reportedInstalls = pluginData['active_installs'];
        const name = pluginData['name'];
        const lastUpdated = pluginData['last_updated'].split(' ')[0];
        const latestVersionDownloads = getLatestVersionDownloads(downloadsData, lastUpdated);
        const latestVersionPercentage = getLatestVersionPercentage(versionsData);
        const estimatedInstalls = Math.floor(latestVersionDownloads / (latestVersionPercentage / 100));

        return new Response(JSON.stringify({
            name: name,
            lastUpdated: lastUpdated,
            latestVersionDownloads: latestVersionDownloads,
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