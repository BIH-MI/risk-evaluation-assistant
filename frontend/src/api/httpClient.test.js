import { handleApiError } from "./httpClient";

test("handleApiError preserves backend error code and status", async () => {
  const response = new Response(
    JSON.stringify({
      code: "DATASET_NAME_ALREADY_EXISTS",
      message: "A dataset with this name already exists.",
    }),
    {
      status: 409,
      headers: { "Content-Type": "application/json" },
    }
  );

  await expect(handleApiError(response, "Failed")).rejects.toMatchObject({
    code: "DATASET_NAME_ALREADY_EXISTS",
    message: "A dataset with this name already exists.",
    status: 409,
  });
});
