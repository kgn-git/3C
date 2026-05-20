// #70 AC3 — GitLab Issues REST v4 adapter. Network only via injected HttpClient.
export const gitlabAdapter = {
    tool: "gitlab",
    async createIssue(payload, ctx) {
        const base = ctx.baseUrl.replace(/\/$/, "");
        const res = await ctx.http({
            method: "POST",
            url: `${base}/api/v4/projects/${encodeURIComponent(ctx.project)}/issues`,
            headers: {
                "PRIVATE-TOKEN": ctx.token,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title: payload.title,
                description: payload.body,
                ...(payload.labels && payload.labels.length > 0
                    ? { labels: payload.labels.join(",") }
                    : {}),
            }),
        });
        if (res.status < 200 || res.status >= 300) {
            return { ok: false, error: `gitlab: HTTP ${res.status}` };
        }
        let parsed;
        try {
            parsed = JSON.parse(res.body);
        }
        catch {
            return { ok: false, error: "gitlab: unparseable response" };
        }
        if (typeof parsed.iid !== "number" || typeof parsed.web_url !== "string") {
            return { ok: false, error: "gitlab: missing iid/web_url" };
        }
        return { ok: true, ref: { url: parsed.web_url, number: parsed.iid } };
    },
};
//# sourceMappingURL=gitlab.js.map