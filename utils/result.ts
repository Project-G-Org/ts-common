/**
 * @template DataType - The type of data that the response holds.
 * @template CustomError - Optional custom implementation for errors (defaults to `string` if not defined).
 *
 * @description
 * The `Result` class represents a common response pattern, where the response can either indicate success with valid data or failure with an error.
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
 *
 * console.log(successResponse.isSuccess); // true
 * console.log(successResponse.data); // { id: 1, name: "John Doe" }
 * console.log(errorResponse.isError); // true
 * console.log(errorResponse.error); // "User not found"
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
 * const { data, error } = result.unwrap();
 *
 * if (error) {
 *   console.error("Error:", error); // Handles error safely
 * } else {
 *   console.log("Success:", data); // Output success value
 * }
 *
 * @author Gabriel Spinola
 */
export default class Result<DataType, CustomError = string | unknown | Error> {
    private _data: DataType | null;
    private _error: CustomError | null;

    private constructor(data: DataType | null, error: CustomError | null) {
        this._data = data;
        this._error = error;
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
    static succeed<DataType, E = unknown>(data: DataType): Result<DataType, E> {
        return new Result<DataType, E>(data, null);
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
    static failed<CustomError = string | unknown>(
        error: CustomError,
    ): Result<null, CustomError> {
        return new Result(null, error);
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
    static runCatching<DataType, E = unknown>(
        fn: () => DataType,
    ): Result<DataType | null, E | Error> {
        try {
            const result = fn();
            return Result.succeed<DataType, E>(result);
        } catch (error) {
            return Result.failed<E | Error>(error as E | Error);
        }
    }

    /**
     * Handles the success and error cases using provided callbacks.
     *
     * @param onSuccess - A callback executed with the data in the success case.
     * @param onError - A callback executed with the error in the failure case.
     * @returns The result of the callback execution.
     *
     * @example
     * const result = Result.succeed(42);
     * const message = result.match(
     *   (data) => `Success with data: ${data}`,
     *   (error) => `Failed with error: ${error}`
     * );
     * console.log(message); // "Success with data: 42"
     */
    match<T>(
        onSuccess: (data: DataType) => T,
        onError: (error: CustomError) => T,
    ): T {
        return this.isSuccess
            ? onSuccess(this._data as DataType)
            : onError(this._error as CustomError);
    }

    /**
     * Unwraps the `Result` into a discriminated union of success or error.
     *
     * @returns An object where either `data` is defined and `error` is `null`, or vice versa.
     *
     * @example
     * const result = Result.failed("Error occurred");
     * const { data, error } = result.unwrap();
     * console.log(data); // null
     * console.log(error); // "Error occurred"
     */
    unwrap():
        | { data: DataType; error: null }
        | { data: null; error: CustomError } {
        if (this._data !== null) {
            return { data: this._data, error: null };
        }

        return { data: null, error: this._error as CustomError };
    }

    /**
     * Retrieves the success data, or `null` if the result is a failure.
     *
     * @returns The success data or `null`.
     *
     * @example
     * const success = Result.succeed("Valid data");
     * console.log(success.data); // "Valid data"
     */
    get data(): DataType | null {
        return this._data;
    }

    /**
     * Retrieves the error message or object, or `null` if the result is a success.
     *
     * @returns The error or `null`.
     *
     * @example
     * const failure = Result.failed("An error occurred");
     * console.log(failure.error); // "An error occurred"
     */
    get error(): CustomError | null {
        return this._error;
    }

    /**
     * Checks whether the result represents a success.
     *
     * @returns `true` if the result is a success, otherwise `false`.
     *
     * @example
     * const success = Result.succeed(100);
     * console.log(success.isSuccess); // true
     */
    get isSuccess(): boolean {
        return this._error === null;
    }

    /**
     * Checks whether the result represents a failure.
     *
     * @returns `true` if the result is a failure, otherwise `false`.
     *
     * @example
     * const failure = Result.failed("Error occurred");
     * console.log(failure.isError); // true
     */
    get isError(): boolean {
        return this._error !== null;
    }
}