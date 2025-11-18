export type Nothing = null

export type MaybeError = Error | string | null
export type MaybeData = NonNullable<unknown> | null

/**
 * @private - Using this outside the Result class is a bad practice for large scale projects. Prefer using custom error classes
 */
export type AnyError = string | Error

/**
 * TODO - test the sit out of this
 *
 * @template DataType - The type of data that the response holds.
 * @template CustomError - Optional custom implementation for errors (defaults to `string` if not defined).
 *
 * @description
 * The `Result` class represents a common response pattern, where the response can either indicate success with valid data, failure with an error, or a pending state.
 * It is designed to ensure that operations wrapped in a `Result` are type-safe and predictable, especially when used with Promises.
 *
 * **Important:**
 * When used in conjunction with Promises, the `Result` should handle all errors internally and never throw exceptions.
 * This ensures smooth error handling and prevents unhandled rejections in asynchronous workflows.
 *
 * @example
 * // Example 1: Using Result directly
 * const successResponse = Result.succeed({ id: 1, name: "John Doe" });
 * const errorResponse = Result.failed("User not found");
 * const pendingResponse = Result.pending();
 *
 * console.log(successResponse.isSuccess); // true
 * console.log(successResponse.data); // { id: 1, name: "John Doe" }
 * console.log(errorResponse.isError); // true
 * console.log(errorResponse.error); // "User not found"
 * console.log(pendingResponse.isPending); // true
 *
 * @example
 * // Example 2: Using Result with a Promise
 * async function examplePromise(): Promise<Result<number, string>> {
 *   return new Promise((resolve) => {
 *     const value = Math.random() > 0.5 ? Result.succeed(42) : Result.failed("Failed to compute");
 *     resolve(value);
 *   });
 * }
 *
 * const result = await examplePromise();
 * const { data, error, isPending } = result.unwrap();
 *
 * if (isPending) {
 *   console.log("Loading..."); // Handles pending state
 * } else if (error) {
 *   console.error("Error:", error); // Handles error safely
 * } else {
 *   console.log("Success:", data); // Output success value
 * }
 *
 * @author Gabriel Spinola
 */
export default class Result<DataType = MaybeData, CustomError = MaybeError> {
  private _data: DataType
  private _error: CustomError
  private _isPending: boolean

  private constructor(data: DataType, error: CustomError, isPending = false) {
    this._data = data
    this._error = error
    this._isPending = isPending
  }

  /**
   * Creates a successful `Result` instance with data.
   *
   * @param data - The data for the successful result.
   * @returns A `Result` instance with the given data.
   *
   * @example
   * const success = Result.succeed("Operation succeeded");
   * console.log(success.data); // "Operation succeeded"
   */
  static succeed<DataType>(data: DataType): Result<DataType, null> {
    return new Result(data, null)
  }

  /**
   * Creates a failed `Result` instance with an error.
   *
   * @param error - The error message or object for the failed result.
   * @returns A `Result` instance with the given error.
   *
   * @example
   * const failure = Result.failed("Something went wrong");
   * console.log(failure.error); // "Something went wrong"
   */
  static failed<CustomError = AnyError>(
    error: CustomError,
  ): Result<null, CustomError> {
    return new Result(null, error)
  }

  /**
   * Creates a pending `Result` instance.
   *
   * @returns A `Result` instance representing a pending state.
   *
   * @example
   * const pending = Result.pending();
   * console.log(pending.isPending); // true
   */
  static pending<DataType, CustomError>(): Result<
    DataType | null,
    CustomError | null
  > {
    return new Result(null, null, true)
  }

  /**
   * Executes a potentially error-prone function and captures the result as a `Result`.
   *
   * @param fn - A function to execute, which may throw an error.
   * @returns A `Result` encapsulating the success value or the caught error.
   *
   * @example
   * const result = Result.runCatching(() => {
   *   if (Math.random() > 0.5) {
   *     throw new Error("Random failure");
   *   }
   *   return "Success!";
   * });
   *
   * if (result.isSuccess) {
   *   console.log("Result:", result.data);
   * } else {
   *   console.error("Error:", result.error);
   * }
   */
  static runCatching<DataType extends MaybeData>(
    fn: () => DataType,
  ): Result<MaybeData, MaybeError> {
    try {
      const result = fn()
      return Result.succeed<DataType>(result)
    } catch (error) {
      return Result.failed<AnyError>(error as AnyError)
    }
  }

  /**
   * Handles the success, error, and pending cases using provided callbacks.
   *
   * @param onSuccess - A callback executed with the data in the success case.
   * @param onError - A callback executed with the error in the failure case.
   * @param onPending - A callback executed when the result is pending.
   * @returns The result of the callback execution.
   */
  match<T>(
    onSuccess: (data: DataType) => T,
    onError: (error: CustomError) => T,
    onPending?: () => T,
  ): T {
    if (this._isPending) {
      return onPending ? onPending() : onError(null as CustomError)
    }
    return this.isSuccess
      ? onSuccess(this._data as DataType)
      : onError(this._error as CustomError)
  }

  /**
   * Unwraps the `Result` into a discriminated union of success, error, or pending state.
   */
  unwrap():
    | { data: DataType; error: null; isPending: false }
    | { data: null; error: CustomError; isPending: false }
    | { data: null; error: null; isPending: true } {
    if (this._isPending) {
      return { data: null, error: null, isPending: true }
    }
    if (this._data !== null) {
      return { data: this._data, error: null, isPending: false }
    }
    return { data: null, error: this._error as CustomError, isPending: false }
  }

  get data(): MaybeData {
    return this._data as MaybeData
  }

  get error(): MaybeError {
    return this._error as MaybeError
  }

  get isSuccess(): boolean {
    return this._error === null
  }

  get isError(): boolean {
    return this._error !== null
  }

  get isPending(): boolean {
    return this._isPending
  }
}
