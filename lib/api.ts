import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export async function parseJsonBody<T>(request: Request, schema: ZodSchema<T>) {
  try {
    const json = await request.json();
    return {
      ok: true as const,
      data: schema.parse(json)
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false as const,
        response: NextResponse.json(
          {
            error: "Invalid request body.",
            details: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message
            }))
          },
          { status: 400 }
        )
      };
    }

    return {
      ok: false as const,
      response: NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
    };
  }
}
