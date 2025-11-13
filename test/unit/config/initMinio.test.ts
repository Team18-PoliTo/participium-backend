const loadInitMinio = async () => {
  jest.resetModules();

  const bucketExists = jest.fn();
  const makeBucket = jest.fn();
  const listBuckets = jest.fn();

  jest.doMock("../../../src/config/minioClient", () => ({
    minioClient: {
      bucketExists,
      makeBucket,
      listBuckets,
    },
    MINIO_BUCKET: "unit-test-bucket",
  }));

  const { initMinio } = await import("../../../src/config/initMinio");

  return { initMinio, bucketExists, makeBucket, listBuckets };
};

describe("initMinio", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("creates bucket when it does not exist", async () => {
    const { initMinio, bucketExists, makeBucket, listBuckets } =
      await loadInitMinio();
    bucketExists.mockResolvedValue(false);
    makeBucket.mockResolvedValue(undefined);
    listBuckets.mockResolvedValue([{ name: "unit-test-bucket" }]);
    const logSpy = jest.spyOn(console, "log").mockImplementation();

    await initMinio();

    expect(makeBucket).toHaveBeenCalledWith("unit-test-bucket", "us-east-1");
    expect(listBuckets).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      "[MinIO] Created bucket: unit-test-bucket"
    );
  });

  it("skips creation when bucket exists", async () => {
    const { initMinio, bucketExists, makeBucket, listBuckets } =
      await loadInitMinio();
    bucketExists.mockResolvedValue(true);
    listBuckets.mockResolvedValue([{ name: "unit-test-bucket" }]);
    const logSpy = jest.spyOn(console, "log").mockImplementation();

    await initMinio();

    expect(makeBucket).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      "[MinIO] Bucket already exists: unit-test-bucket"
    );
  });

  it("logs when bucket already exists during creation", async () => {
    const { initMinio, bucketExists, makeBucket } = await loadInitMinio();
    bucketExists.mockResolvedValue(false);
    makeBucket.mockRejectedValue({ code: "BucketAlreadyExists" });
    const logSpy = jest.spyOn(console, "log").mockImplementation();

    await initMinio();

    expect(logSpy).toHaveBeenCalledWith(
      '[MinIO] Bucket "unit-test-bucket" already exists.'
    );
  });

  it("logs error when initialization fails unexpectedly", async () => {
    const { initMinio, bucketExists, makeBucket } = await loadInitMinio();
    bucketExists.mockResolvedValue(false);
    const error = new Error("network failure");
    makeBucket.mockRejectedValue(error);
    const errorSpy = jest.spyOn(console, "error").mockImplementation();

    await initMinio();

    expect(errorSpy).toHaveBeenCalledWith(
      "[MinIO] Initialization failed:",
      error
    );
  });

  it("logs error if listing buckets fails", async () => {
    const { initMinio, bucketExists, makeBucket, listBuckets } =
      await loadInitMinio();
    bucketExists.mockResolvedValue(true);
    makeBucket.mockResolvedValue(undefined);
    const error = new Error("list failed");
    listBuckets.mockRejectedValue(error);
    const errorSpy = jest.spyOn(console, "error").mockImplementation();

    await initMinio();

    expect(errorSpy).toHaveBeenCalledWith(
      "[MinIO] Initialization failed:",
      error
    );
  });

  it("logs already-exists message when makeBucket throws ownership error", async () => {
    const { initMinio, bucketExists, makeBucket } = await loadInitMinio();
    bucketExists.mockResolvedValue(false);
    makeBucket.mockRejectedValue({ code: "BucketAlreadyOwnedByYou" });
    const logSpy = jest.spyOn(console, "log").mockImplementation();

    await initMinio();

    expect(logSpy).toHaveBeenCalledWith('[MinIO] Bucket "unit-test-bucket" already exists.');
  });

  it("falls back to create when bucketExists rejects", async () => {
    const { initMinio, bucketExists, makeBucket, listBuckets } =
      await loadInitMinio();
    bucketExists.mockRejectedValue(new Error("timeout"));
    makeBucket.mockResolvedValue(undefined);
    listBuckets.mockResolvedValue([{ name: "unit-test-bucket" }]);
    const logSpy = jest.spyOn(console, "log").mockImplementation();

    await initMinio();

    expect(makeBucket).toHaveBeenCalledWith("unit-test-bucket", "us-east-1");
    expect(logSpy).toHaveBeenCalledWith(
      `[MinIO] Created bucket: unit-test-bucket`
    );
  });
});
