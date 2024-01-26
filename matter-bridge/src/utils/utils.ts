import { ValidationError } from '@project-chip/matter.js/common';
import { execSync } from 'child_process';

const envVar = process.env;
console.debug({ envVar });

export function getParameter(name: string) {
    return envVar[name];
}

export function hasParameter(name: string) {
    return getIntParameter(name) !== undefined;
}

export function getIntParameter(name: string) {
    const value = getParameter(name);
    if (value === undefined) return undefined;
    const intValue = parseInt(value, 10);
    if (isNaN(intValue))
        throw new ValidationError(
            `Invalid value for parameter ${name}: ${value} is not a number`
        );
    return intValue;
}

export function commandExecutor(scriptParamName: string) {
    const script = getParameter(scriptParamName);
    if (script === undefined) return undefined;
    return () =>
        console.log(
            `${scriptParamName}: ${execSync(script).toString().slice(0, -1)}`
        );
}
