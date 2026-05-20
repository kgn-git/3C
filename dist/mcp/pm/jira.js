// #70 AC1 — Jira Cloud REST v3 adapter. Network only via the injected
// HttpClient (no live network in tests). Token never logged or cached.
export const jiraAdapter = {
    tool: "jira",
    async createIssue(payload, ctx) {
        const res = await ctx.http({
            method: "POST",
            url: `${ctx.baseUrl.replace(/\/$/, "")}/rest/api/3/issue`,
            headers: {
                Authorization: `Bearer ${ctx.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                fields: {
                    project: { key: ctx.project },
                    summary: payload.title,
                    description: payload.body,
                    issuetype: { name: "Task" },
                    ...(payload.labels && payload.labels.length > 0
                        ? { labels: [...payload.labels] }
                        : {}),
                },
            }),
        });
        if (res.status < 200 || res.status >= 300) {
            return { ok: false, error: `jira: HTTP ${res.status}` };
        }
        let key;
        try {
            key = JSON.parse(res.body).key;
        }
        catch {
            return { ok: false, error: "jira: unparseable response" };
        }
        if (typeof key !== "string") {
            return { ok: false, error: "jira: no issue key in response" };
        }
        return {
            ok: true,
            ref: {
                url: `${ctx.baseUrl.replace(/\/$/, "")}/browse/${key}`,
                number: Number.parseInt(key.replace(/^\D+/, ""), 10) || 0,
            },
        };
    },
};
//# sourceMappingURL=jira.js.map