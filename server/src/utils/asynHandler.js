export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({
                success: false,
                statusCode,
                message: error.message || "Lỗi hệ thống",
            });
        });
    }
}
