const fetchData = (slug) => {
    return fetch(`/api/data?slug=${slug}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response from function was not ok");
            }
            return response.json();
        });
};

document.getElementById('pluginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const slug = event.target.slug.value;
    const results = document.getElementById('results');
    results.innerHTML = "";

    fetchData(slug)
        .then(data => {
            results.innerHTML = results.innerHTML = `
                <li><a href="https://wordpress.org/plugins/${slug}" target="_blank">${data.name}</a></li>
                <li>Last Updated: ${data.lastUpdated}</li>
                <li>Last Peak: ${data.normalizedDownloads.latestPeakValue.toLocaleString()}</li>
                <li>Last Version Percentage: ${data.latestVersionPercentage}%</li>
                <li>Estimated Active Installs: ${data.estimatedInstalls.toLocaleString()}</li>
                <li>Reported Active Installs: ${data.reportedInstalls.toLocaleString()}+</li>
            `;

        })
        .catch(error => {
            results.innerHTML = `<li>Couldn't find <code>${slug}</code>.</li>`;
        });
});
