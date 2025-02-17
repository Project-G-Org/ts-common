import { useEffect, useRef, useState } from "react";
import Result, { type AnyError } from "./result";

export class NotFoundError extends Error {}
export class PaymentRequiredError extends Error {}

export type RequestError = AnyError | NotFoundError | PaymentRequiredError;
export type BaseRequest<Params> = (params: Params) => Promise<Response>;
export type Request<Value, Params, Error> = (
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
        type RequestType = { message: CustomError };
        const { message: data }: RequestType = await response.json();

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


