/* eslint-disable */
export class Logger {
  private context: string;
  private colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    gray: "\x1b[90m",
    bold: "\x1b[1m",
  };

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const prefix = `${timestamp} ${this.context}:`;
    return { prefix, message, ...(data && { data }) };
  }

  private colorize(color: keyof typeof this.colors, text: string): string {
    return `${this.colors[color]}${text}${this.colors.reset}`;
  }

  private formatLogLevel(level: string): string {
    return `[${level.toUpperCase()}]`;
  }

  private formatOutput({
    prefix,
    message,
    data,
  }: {
    prefix: string;
    message: string;
    data?: any;
  }) {
    const logParts = [prefix, message];
    if (data) {
      logParts.push("\n" + JSON.stringify(data, null, 2));
    }
    return logParts.join(" ");
  }

  info(message: string, data?: any) {
    const formattedData = this.formatMessage("info", message, data);
    console.log(
      this.colorize("blue", this.formatLogLevel("info")) +
        " " +
        this.formatOutput(formattedData)
    );
  }

  error(message: string, error?: Error | unknown, data?: any) {
    const errorData =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;

    const formattedData = this.formatMessage("error", message, {
      ...data,
      error: errorData,
    });

    console.error(
      this.colorize("red", this.colors.bold + this.formatLogLevel("error")) +
        " " +
        this.formatOutput(formattedData)
    );
  }

  warn(message: string, data?: any) {
    const formattedData = this.formatMessage("warn", message, data);
    console.warn(
      this.colorize("yellow", this.formatLogLevel("warn")) +
        " " +
        this.formatOutput(formattedData)
    );
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === "development") {
      const formattedData = this.formatMessage("debug", message, data);
      console.debug(
        this.colorize("gray", this.formatLogLevel("debug")) +
          " " +
          this.formatOutput(formattedData)
      );
    }
  }
}
