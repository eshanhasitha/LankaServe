export function sendOk(res, message, data, pagination = null) {
  return res.status(200).json({ success: true, message, data, pagination, errorCode: null });
}

export function sendFail(res, status, message, errorCode = 'ERROR') {
  return res.status(status).json({ success: false, message, data: null, pagination: null, errorCode });
}
