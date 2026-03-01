const LEVELS = { DEBUG: 10, INFO: 20, WARNING: 30, ERROR: 40 };

let _globalLevel = LEVELS.INFO;

function _timestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function _format(ts, name, level, msg) {
    return `${ts} - ${name} - ${level} - ${msg}`;
}

function _sprintf(template, ...args) {
    let i = 0;
    return template.replace(/%[sd]/g, () => (i < args.length ? args[i++] : ''));
}

class Logger {
    constructor(name) {
        this.name = name;
    }

    _log(levelName, levelValue, template, ...args) {
        if (levelValue < _globalLevel) return;
        const msg = args.length ? _sprintf(template, ...args) : template;
        const line = _format(_timestamp(), this.name, levelName, msg);
        if (levelValue >= LEVELS.ERROR) {
            console.error(line);
        } else if (levelValue >= LEVELS.WARNING) {
            console.warn(line);
        } else {
            console.log(line);
        }
    }

    debug(template, ...args) {
        this._log('DEBUG', LEVELS.DEBUG, template, ...args);
    }

    info(template, ...args) {
        this._log('INFO', LEVELS.INFO, template, ...args);
    }

    warning(template, ...args) {
        this._log('WARNING', LEVELS.WARNING, template, ...args);
    }

    error(template, ...args) {
        this._log('ERROR', LEVELS.ERROR, template, ...args);
    }
}

const _loggers = {};

export function getLogger(name) {
    if (!_loggers[name]) {
        _loggers[name] = new Logger(name);
    }
    return _loggers[name];
}

export function setLevel(level) {
    if (typeof level === 'string') {
        _globalLevel = LEVELS[level.toUpperCase()] ?? LEVELS.INFO;
    } else {
        _globalLevel = level;
    }
}

export { LEVELS };
