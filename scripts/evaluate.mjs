import { evaluate } from '../dist/evaluation.mjs';
import { writeFileSync } from 'node:fs';
const report=evaluate();
writeFileSync(new URL('../evaluation/regression-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.quoteErrors) process.exitCode=1;
