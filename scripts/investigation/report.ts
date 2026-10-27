import { ReportSchema } from './schema.js';
function fence(value: string): string {
  let longest = 2;
  for (const run of value.matchAll(/`+/g))
    longest = Math.max(longest, run[0].length);
  const mark = '`'.repeat(longest + 1);
  return mark + '\n' + value + '\n' + mark;
}
export function renderReport(input: unknown): string {
  const report = ReportSchema.parse(input),
    confirmed = report.journeys.filter((j) => j.status === 'regression').length;
  const lines = [
    '## Domscribe browser PR investigation',
    '',
    `Status: **${report.status}**. Confirmed journey regressions: **${confirmed}**.`,
    `Tested scope: ${report.journeys.length} configured journey contracts; this is not a full-app health verdict.`,
    `Base: ${report.metadata.baseCommit ?? 'unresolved'}; head: ${report.metadata.headCommit ?? 'unresolved'}.`,
    `Execution: local trusted repository. Agent browser used: ${report.metadata.agentBrowserUsed}; Domscribe inspection used: ${report.metadata.domscribeUsed}.`,
    '',
  ];
  for (const j of report.journeys) {
    lines.push(
      `### ${j.id}: ${j.status}`,
      '',
      fence(j.intent),
      '',
      fence(j.reason),
      '',
    );
    for (const f of j.findings)
      lines.push(
        `Expectation: ${f.expectationId}`,
        '',
        fence(
          JSON.stringify({ expected: f.expected, observed: f.actual }, null, 2),
        ),
        '',
        ...f.artifacts.map(
          (a) =>
            `Evidence: [artifact](${a
              .split('/')
              .map((s) =>
                encodeURIComponent(s).replace(
                  /[!'()*]/g,
                  (c) => '%' + c.charCodeAt(0).toString(16),
                ),
              )
              .join('/')})`,
        ),
        '',
      );
  }
  lines.push(
    'Expected behavior comes from the configured product contract. Review intentional behavior changes before treating a regression as a product bug.',
    '',
  );
  return lines.join('\n');
}
