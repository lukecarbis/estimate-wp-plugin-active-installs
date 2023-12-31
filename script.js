const fetchData = (slug) => {
    return fetch(`/api/data?slug=${slug}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response from function was not ok");
            }
            return response.json();
        });
};

document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (slug) {
        const resultsDiv = document.createElement("div");
        resultsDiv.id = "results";
        document.body.insertBefore(resultsDiv, document.body.firstChild);

        resultsDiv.innerHTML = "<p>Loading...</p>";

        fetchData(slug)
            .then(data => {
                resultsDiv.innerHTML = `
                    <h2><a href="https://wordpress.org/plugins/${slug}" target="_blank">${data.name}</a></h2>
                    <ul>
                        <li>Last Updated: ${data.lastUpdated}</li>
                        <li>Latest Version Installs: ${data.latestVersionDownloads.toLocaleString()}</li>
                        <li>Last Version Percentage: ${data.latestVersionPercentage}%</li>
                        <li>Reported Active Installs: ${data.reportedInstalls.toLocaleString()}+</li>
                        <li><strong>Estimated Active Installs: ${data.estimatedInstalls.toLocaleString()}</strong></li>
                    </ul>
                `;

            })
            .catch(error => {
                resultsDiv.innerHTML = `<p>Couldn't find <code>${slug}</code>.</p>`;
            });
    }
});
