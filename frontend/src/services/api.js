const api = {
    async post(path, body) {
        const response = await fetch(`/api${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
        });

        const contentType = response.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            const error = new Error(typeof data === "string" ? data : data?.message || "Request failed");
            error.response = { data, status: response.status };
            throw error;
        }

        return { data, status: response.status };
    },
};

export default api;
