import { useEffect, useRef, useState } from "react";
import Result, { AnyError } from "./result";

export class NotFoundError extends Error {}
export class PaymentRequiredError extends Error {}

type RequestError = AnyError | NotFoundError | PaymentRequiredError;
type BaseRequest<Params> = (params: Params) => Promise<Response>;
type Request<Value, Params, Error> = (
  args: Params,
) => Promise<Result<Value | null, Error | null>>;

/**
 * Creates a type-safe request wrapper that handles common HTTP response patterns
 * and error cases. It converts the response into a Result type.
 * 
 * @param request - The base request function that returns a Promise<Response>
 * @returns A function that returns a Result containing either the successful response data or an error
 * 
 * @example
 * // Define your API request
 * const getUser = (id: string) => fetch(`/api/users/${id}`);
 * 
 * // Create a type-safe request handler
 * const getUserRequest = requestFactory<User>(getUser);
 * 
 * // Use the request
 * const result = await getUserRequest({ id: "123" });
 * result.match(
 *   (data) => console.log("Success:", data),
 *   (error) => console.error("Error:", error),
 *   () => console.log("Loading...")
 * );
 */
export function requestFactory<Value, CustomError = RequestError>(
  request: BaseRequest<unknown>,
): Request<Value, Parameters<typeof request>[0], CustomError | null> {
  return async (
    args: Parameters<typeof request>[0],
  ): Promise<Result<Value | null, CustomError | null>> => {
    try {
      const response = await request(args);

      if (!response.ok) {
        type requestType = { message: CustomError };
        const { message: data }: requestType = await response.json();

        if (response.status === 404) {
          throw new NotFoundError(data as string);
        }

        if (response.status === 402) {
          throw new PaymentRequiredError(data as string);
        }

        console.error("Response's not okay: ", JSON.stringify(data));
        throw new Error("Response's not okay");
      }

      const { data }: { data: Value } = await response.json();

      return Result.succeed(data);
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return Result.failed(error as CustomError);
      }

      if (error instanceof PaymentRequiredError) {
        return Result.failed(error as CustomError);
      }

      console.error("Request failed: ", error);
      return Result.failed(error as CustomError);
    }
  };
}

/**
 * A React hook that wraps requestFactory for use in components. It handles the request lifecycle
 * and maintains the request state.
 * 
 * @param request - The base request function that returns a Promise<Response>
 * @param args - Optional arguments to pass to the request function
 * @returns A Result object containing the request state (data, error, or pending)
 * 
 * @example
 * // In a React component:
 * function UserProfile({ userId }: { userId: string }) {
 *   const result = useRequestFactory<User>(
 *     () => fetch(`/api/users/${userId}`),
 *     { userId }
 *   );
 * 
 *   return result.match(
 *     (user) => <div>Welcome {user.name}</div>,
 *     (error) => <div>Error: {error.message}</div>,
 *     () => <div>Loading...</div>
 *   );
 * }
 */
export function useRequestFactory<Value, CustomError = RequestError>(
  request: BaseRequest<any>,
  args?: Parameters<typeof request>[0],
) {
  const [result, setResult] = useState<
    Result<Value | null, CustomError | null>
  >(
    Result.pending(),
  );
  const hasExecuted = useRef(false);

  useEffect(() => {
    const executeRequest = async () => {
      if (hasExecuted.current) return;
      hasExecuted.current = true;

      const req = requestFactory<Value, CustomError>(
        (params) => request(params),
      );
      const _ = (await req(args as Parameters<typeof request>[0])).match(
        (data) => setResult(Result.succeed(data)),
        (error) => setResult(Result.failed(error)),
        () => {
          throw new Error("Request is pending after finishing its execution");
        },
      );
    };

    executeRequest();
  }, []);

  return result;
}
