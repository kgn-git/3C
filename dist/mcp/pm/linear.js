// #70 AC2 — Linear GraphQL adapter. Network only via injected HttpClient.
const MUTATION = "mutation($t:String!,$d:String,$tm:String!){issueCreate(input:{title:$t,description:$d,teamId:$tm}){issue{url identifier}}}";
export const linearAdapter = {
    tool: "linear",
    async createIssue(payload, ctx) {
        const res = await ctx.http({
            method: "POST",
            url: ctx.baseUrl, // https://api.linear.app/graphql
            headers: {
                Authorization: ctx.token,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: MUTATION,
                variables: { t: payload.title, d: payload.body, tm: ctx.project },
            }),
        });
        if (res.status < 200 || res.status >= 300) {
            return { ok: false, error: `linear: HTTP ${res.status}` };
        }
        let issue;
        try {
            issue = JSON.parse(res.body).data?.issueCreate?.issue;
        }
        catch {
            return { ok: false, error: "linear: unparseable response" };
        }
        if (!issue || typeof issue.url !== "string") {
            return { ok: false, error: "linear: no issue in response" };
        }
        const id = typeof issue.identifier === "string" ? issue.identifier : "";
        return {
            ok: true,
            ref: {
                url: issue.url,
                number: Number.parseInt(id.replace(/^\D+/, ""), 10) || 0,
            },
        };
    },
};
//# sourceMappingURL=linear.js.map