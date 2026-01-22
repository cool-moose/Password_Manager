/**
 * Colored console print utilities for Node.js
 * 
 * Usage:
 *   import { printRed, printGreen, printSuccess, printError } from './prints';
 *   printSuccess('Operation completed');
 *   printError('Something went wrong');
 */

// ANSI color codes for console output
export const Colors = {
    // Reset
    Reset: '\x1b[0m',

    // Styles
    Bright: '\x1b[1m',
    Dim: '\x1b[2m',
    Underscore: '\x1b[4m',
    Blink: '\x1b[5m',
    Reverse: '\x1b[7m',
    Hidden: '\x1b[8m',

    // Foreground colors
    Black: '\x1b[30m',
    Red: '\x1b[31m',
    Green: '\x1b[32m',
    Yellow: '\x1b[33m',
    Blue: '\x1b[34m',
    Magenta: '\x1b[35m',
    Cyan: '\x1b[36m',
    White: '\x1b[37m',
    Gray: '\x1b[90m',

    // Bright foreground colors
    BrightRed: '\x1b[91m',
    BrightGreen: '\x1b[92m',
    BrightYellow: '\x1b[93m',
    BrightBlue: '\x1b[94m',
    BrightMagenta: '\x1b[95m',
    BrightCyan: '\x1b[96m',
    BrightWhite: '\x1b[97m',

    // Background colors
    BgBlack: '\x1b[40m',
    BgRed: '\x1b[41m',
    BgGreen: '\x1b[42m',
    BgYellow: '\x1b[43m',
    BgBlue: '\x1b[44m',
    BgMagenta: '\x1b[45m',
    BgCyan: '\x1b[46m',
    BgWhite: '\x1b[47m',
} as const;

export type ColorName = keyof typeof Colors;

// ============ Basic Color Functions ============

export function printRed(msg: string): void {
    console.log(Colors.Red + msg + Colors.Reset);
}

export function printGreen(msg: string): void {
    console.log(Colors.Green + msg + Colors.Reset);
}

export function printYellow(msg: string): void {
    console.log(Colors.Yellow + msg + Colors.Reset);
}

export function printBlue(msg: string): void {
    console.log(Colors.Blue + msg + Colors.Reset);
}

export function printCyan(msg: string): void {
    console.log(Colors.Cyan + msg + Colors.Reset);
}

export function printMagenta(msg: string): void {
    console.log(Colors.Magenta + msg + Colors.Reset);
}

export function printGray(msg: string): void {
    console.log(Colors.Gray + msg + Colors.Reset);
}

export function printWhite(msg: string): void {
    console.log(Colors.White + msg + Colors.Reset);
}

// ============ Generic Functions ============

/**
 * Print with any color from the Colors object
 */
export function printColor(msg: string, color: ColorName): void {
    console.log(Colors[color] + msg + Colors.Reset);
}

/**
 * Colorize a string without printing (returns colored string)
 */
export function colorize(msg: string, color: ColorName): string {
    return Colors[color] + msg + Colors.Reset;
}

/**
 * Print with multiple styles combined
 */
export function printStyled(msg: string, ...styles: ColorName[]): void {
    const prefix = styles.map(s => Colors[s]).join('');
    console.log(prefix + msg + Colors.Reset);
}
