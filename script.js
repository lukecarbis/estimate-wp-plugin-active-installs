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
    fetchData(slug)
        .then(data => {
            const results = document.getElementById('results');

            // Clear previous results
            results.innerHTML = "";

            // Populate the results
            results.innerHTML = results.innerHTML = `
                <li>Last Peak: ${data.latestPeakDownloads.toLocaleString()}</li>
                <li>Last Version Percentage: ${data.latestVersionPercentage}%</li>
                <li>Estimated Total Users: ${data.estimatedTotalUsers.toLocaleString()}</li>
            `;

        })
        .catch(error => {
            console.error("Error:", error.message);
        });
});