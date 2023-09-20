const fetchData = () => {
    return fetch('/api/data?slug=hello-dolly')
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response from function was not ok");
            }
            return response.json();
        });
};

fetchData()
    .then(data => {
        console.log("Last Peak:", data.latestPeakDownloads);
        console.log("Last Version Percentage:", data.latestVersionPercentage);
        console.log("Estimated Total Users:", data.estimatedTotalUsers);
    })
    .catch(error => {
        console.error("Error:", error.message);
    });
