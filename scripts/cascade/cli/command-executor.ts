import {
  executeCascadeCommand,
  type CascadeCommandDispatcherOptions,
  type CascadeCommandInvocation,
} from "./command-dispatcher";

/**
 * Serial asynchronous application boundary for long-lived callers.
 *
 * CLI invocations can use executeCascadeCommand directly. A daemon, local
 * HTTP endpoint, or MCP transport should keep one executor and submit work to
 * it so process-global environment and repository writes are not interleaved.
 */
export class CascadeCommandExecutor {
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly options: CascadeCommandDispatcherOptions = {},
  ) {}

  execute(invocation: CascadeCommandInvocation): Promise<number> {
    const result = this.tail.then(() =>
      executeCascadeCommand(invocation, this.options)
    );
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
