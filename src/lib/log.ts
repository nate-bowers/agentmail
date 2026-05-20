// Tiny structured-logging wrapper. Emits one JSON line per call so Vercel
// (and any future log aggregator) can grep by field instead of regexing
// over freeform prefixes like "[Pipeline] Stage 2.5: ...".
//
// Migrate other callsites incrementally; both patterns coexist fine.
// `console.log` calls and `log()` calls can live side by side — there's
// no global setup, no transport, no buffering. Just JSON.stringify and out.

export type LogLevel = 'info' | 'warn' | 'error';

interface LogFn {
  (level: LogLevel, context: string, message: string, fields?: Record<string, unknown>): void;
  info: (context: string, message: string, fields?: Record<string, unknown>) => void;
  warn: (context: string, message: string, fields?: Record<string, unknown>) => void;
  error: (context: string, message: string, fields?: Record<string, unknown>) => void;
}

function emit(
  level: LogLevel,
  context: string,
  message: string,
  fields?: Record<string, unknown>,
): void {
  const entry = {
    level,
    ts: new Date().toISOString(),
    context,
    message,
    ...(fields ?? {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const log: LogFn = Object.assign(
  (level: LogLevel, context: string, message: string, fields?: Record<string, unknown>) =>
    emit(level, context, message, fields),
  {
    info: (context: string, message: string, fields?: Record<string, unknown>) =>
      emit('info', context, message, fields),
    warn: (context: string, message: string, fields?: Record<string, unknown>) =>
      emit('warn', context, message, fields),
    error: (context: string, message: string, fields?: Record<string, unknown>) =>
      emit('error', context, message, fields),
  },
);
