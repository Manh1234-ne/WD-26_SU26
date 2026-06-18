import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
	ArrowLeftOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	CreditCardOutlined,
	LoadingOutlined,
	QrcodeOutlined,
} from '@ant-design/icons'
import { api } from '../../services/api'
import { useAuthStore } from '../../features/auth/auth.store'

type PaymentRecord = {
	_id: string
	booking: string
	user: string
	amount: number
	method: 'cash' | 'card' | 'momo' | 'vnpay' | 'zalopay' | 'bank_transfer'
	status: 'pending' | 'paid' | 'failed' | 'refunded'
	transactionId?: string
	paidAt?: string
	refundedAt?: string
	note?: string
}

type SeatDraft =
	| string
	| {
			seatCode?: string
			code?: string
			label?: string
			name?: string
			price?: number
			seatType?: string
		}

type PaymentDraft = {
	bookingId?: string
	bookingCode?: string
	movieId?: string
	movieTitle?: string
	moviePosterUrl?: string
	movieBackdropUrl?: string
	cinemaName?: string
	roomName?: string
	showtimeStart?: string
	showtimeEnd?: string
	showtimeFormat?: string
	language?: string
	subtitle?: string
	seats?: SeatDraft[]
	totalSeatPrice?: number
	discountAmount?: number
	finalAmount?: number
	expiresAt?: string
}

type PaymentMethodKey = 'vnpay' | 'momo' | 'cash' | 'card'

const storageKeys = [
	'cinema_checkout',
	'cinema_booking_snapshot',
	'cinema_payment_draft',
	'cinema_booking_draft',
]

const paymentMethods: Array<{
	key: PaymentMethodKey
	title: string
	description: string
	badge: string
	icon: typeof QrcodeOutlined
	enabled: boolean
}> = [
	{
		key: 'vnpay',
		title: 'VNPay',
		description: 'Thanh toán qua cổng VNPay và quay lại trang xác nhận ngay.',
		badge: 'Khuyến nghị',
		icon: CreditCardOutlined,
		enabled: true,
	},
	{
		key: 'momo',
		title: 'MoMo mock',
		description: 'Mở trang thanh toán giả lập để kiểm thử luồng đặt vé.',
		badge: 'Demo',
		icon: QrcodeOutlined,
		enabled: true,
	},
	{
		key: 'cash',
		title: 'Tại quầy',
		description: 'Giữ chỗ và thanh toán trực tiếp tại quầy vé.',
		badge: 'Sắp có',
		icon: ClockCircleOutlined,
		enabled: false,
	},
	{
		key: 'card',
		title: 'Thẻ ngân hàng',
		description: 'Hỗ trợ thẻ nội địa và quốc tế trong bản mở rộng sau.',
		badge: 'Sắp có',
		icon: ClockCircleOutlined,
		enabled: false,
	},
]

const currency = new Intl.NumberFormat('vi-VN', {
	style: 'currency',
	currency: 'VND',
	maximumFractionDigits: 0,
})

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
	dateStyle: 'full',
	timeStyle: 'short',
})

function formatCurrency(value = 0) {
	return currency.format(value)
}

function formatDateTime(value?: string) {
	if (!value) {
		return 'Đang cập nhật'
	}

	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return value
	}

	return dateTimeFormatter.format(date)
}

function getStoredDraft(): PaymentDraft {
	if (typeof window === 'undefined') {
		return {}
	}

	for (const key of storageKeys) {
		const rawValue = window.localStorage.getItem(key)

		if (!rawValue) {
			continue
		}

		try {
			const parsed = JSON.parse(rawValue) as PaymentDraft
			if (parsed && typeof parsed === 'object') {
				return parsed
			}
		} catch {
			continue
		}
	}

	return {}
}

function normalizeSeatLabel(seat: SeatDraft) {
	if (typeof seat === 'string') {
		return seat
	}

	return seat.seatCode || seat.code || seat.label || seat.name || 'Ghế'
}

function normalizeSeatType(seat: SeatDraft) {
	if (typeof seat === 'string') {
		return 'Tiêu chuẩn'
	}

	if (!seat.seatType) {
		return 'Tiêu chuẩn'
	}

	const seatType = seat.seatType.toLowerCase()

	if (seatType === 'vip') return 'VIP'
	if (seatType === 'couple') return 'Couple'
	if (seatType === 'disabled') return 'Ưu tiên'

	return 'Tiêu chuẩn'
}

function Payment() {
	const location = useLocation()
	const [searchParams] = useSearchParams()
	const user = useAuthStore((state) => state.user)
	const storedDraft = useMemo(() => getStoredDraft(), [location.key])
	const routeState = (location.state as Partial<PaymentDraft> | null) || {}

	const draft = useMemo(
		() => ({
			...storedDraft,
			...routeState,
		}),
		[routeState, storedDraft],
	)

	const bookingId = searchParams.get('bookingId') || draft.bookingId || ''
	const paymentStatusParam = searchParams.get('status') || ''
	const paymentIdParam = searchParams.get('paymentId') || ''

	const [payment, setPayment] = useState<PaymentRecord | null>(null)
	const [pageError, setPageError] = useState('')
	const [isLoadingPayment, setIsLoadingPayment] = useState(false)
	const [processingMethod, setProcessingMethod] = useState<PaymentMethodKey | null>(null)

	useEffect(() => {
		if (!bookingId) {
			setPayment(null)
			return
		}

		let isMounted = true

		setIsLoadingPayment(true)
		api
			.get(`/payments/booking/${bookingId}`)
			.then((response) => {
				if (!isMounted) {
					return
				}

				setPayment(response.data.data as PaymentRecord)
				setPageError('')
			})
			.catch(() => {
				if (isMounted) {
					setPayment(null)
				}
			})
			.finally(() => {
				if (isMounted) {
					setIsLoadingPayment(false)
				}
			})

		return () => {
			isMounted = false
		}
	}, [bookingId])

	const seats = useMemo(
		() => (Array.isArray(draft.seats) ? draft.seats : []),
		[draft.seats],
	)

	const subtotal = payment?.amount ?? draft.totalSeatPrice ?? 0
	const discountAmount = draft.discountAmount ?? 0
	const finalAmount = payment?.amount ?? draft.finalAmount ?? Math.max(subtotal - discountAmount, 0)
	const paymentMethod = payment?.method || 'vnpay'
	const status = payment?.status || paymentStatusParam || 'pending'

	const isSuccess = status === 'success' || status === 'paid'
	const isFail = status === 'fail' || status === 'failed'
	const hasBookingData = Boolean(bookingId || draft.movieTitle || seats.length > 0)

	const seatSummary = useMemo(
		() =>
			seats.map((seat) => ({
				label: normalizeSeatLabel(seat),
				type: normalizeSeatType(seat),
				price: typeof seat === 'object' && seat ? seat.price : undefined,
			})),
		[seats],
	)

	const showtimeLabel = draft.showtimeStart ? formatDateTime(draft.showtimeStart) : 'Chưa có lịch chiếu'
	const expiresAtLabel = draft.expiresAt ? formatDateTime(draft.expiresAt) : ''
	const expiresInMinutes = draft.expiresAt
		? Math.max(Math.ceil((new Date(draft.expiresAt).getTime() - Date.now()) / 60000), 0)
		: null

	async function handlePay(method: PaymentMethodKey) {
		if (!bookingId) {
			setPageError('Thiếu bookingId. Hãy quay lại bước chọn ghế hoặc đơn hàng của bạn.')
			return
		}

		setProcessingMethod(method)
		setPageError('')

		try {
			if (method === 'vnpay') {
				const response = await api.post('/payments/create-vnpay-url', { bookingId })
				const paymentUrl = response.data.data?.paymentUrl as string | undefined

				if (!paymentUrl) {
					throw new Error('Không tạo được link VNPay')
				}

				window.location.assign(paymentUrl)
				return
			}

			if (method === 'momo') {
				const response = await api.post('/mock-momo/create', { bookingId })
				const payUrl = response.data.data?.payUrl as string | undefined

				if (!payUrl) {
					throw new Error('Không tạo được link MoMo')
				}

				window.location.assign(payUrl)
				return
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Không thể khởi tạo thanh toán'
			setPageError(message)
		} finally {
			setProcessingMethod(null)
		}
	}

	return (
		<section className="payment-page">
			<div className={`payment-hero ${isSuccess ? 'is-success' : isFail ? 'is-fail' : ''}`}>
				<div className="payment-copy">
					<p className="eyebrow">Thanh toán vé phim</p>
					<h1>
						{isSuccess
							? 'Giao dịch đã xác nhận'
							: isFail
								? 'Giao dịch không thành công'
								: 'Hoàn tất đơn hàng trong một bước'}
					</h1>
					<p>
						{isSuccess
							? 'Thanh toán của bạn đã được ghi nhận. Bạn có thể quay lại trang chủ hoặc kiểm tra lịch sử đặt vé.'
							: isFail
								? 'Đơn hàng vẫn đang được giữ chỗ trong thời gian giới hạn. Bạn có thể thanh toán lại ngay bên dưới.'
								: 'Chốt vé đã chọn, xác nhận ghế, kiểm tra tổng tiền và hoàn tất thanh toán bằng VNPay hoặc MoMo mock.'}
					</p>

					<div className="payment-metrics">
						<article>
							<span>Tổng tiền</span>
							<strong>{formatCurrency(finalAmount)}</strong>
						</article>
						<article>
							<span>Phim</span>
							<strong>{draft.movieTitle || 'Đang cập nhật'}</strong>
						</article>
						<article>
							<span>Ghế</span>
							<strong>{seatSummary.length || 0} chỗ</strong>
						</article>
					</div>

					<div className="payment-actions">
						<Link className="ghost-button payment-back-button" to="/">
							<ArrowLeftOutlined />
							Quay về trang chủ
						</Link>
						{!isSuccess && (
							<a className="primary-button" href="#payment-methods">
								Thanh toán ngay
							</a>
						)}
					</div>
				</div>

				<aside className="payment-receipt">
					<div className="receipt-top">
						<div>
							<p className="eyebrow">Mã đơn</p>
							<h2>{draft.bookingCode || bookingId || 'Bản xem trước thanh toán'}</h2>
						</div>
						<span className={`payment-status-tag ${status}`}>
							{status === 'paid' || status === 'success'
								? 'Đã thanh toán'
								: status === 'fail' || status === 'failed'
									? 'Thất bại'
									: 'Đang giữ chỗ'}
						</span>
					</div>

					<div className="receipt-poster">
						{draft.moviePosterUrl ? (
							<img src={draft.moviePosterUrl} alt={draft.movieTitle || 'Poster phim'} />
						) : (
							<div className="poster-fallback">{(draft.movieTitle || 'L').charAt(0)}</div>
						)}
					</div>

					<dl className="receipt-list">
						<div>
							<dt>Suất chiếu</dt>
							<dd>{showtimeLabel}</dd>
						</div>
						<div>
							<dt>Rạp / phòng</dt>
							<dd>{[draft.cinemaName, draft.roomName].filter(Boolean).join(' - ') || 'Đang cập nhật'}</dd>
						</div>
						<div>
							<dt>Định dạng</dt>
							<dd>{[draft.showtimeFormat, draft.language, draft.subtitle].filter(Boolean).join(' • ') || 'Đang cập nhật'}</dd>
						</div>
						<div>
							<dt>Hết hạn giữ ghế</dt>
							<dd>{expiresAtLabel || (expiresInMinutes !== null ? `${expiresInMinutes} phút nữa` : 'Đang cập nhật')}</dd>
						</div>
					</dl>
				</aside>
			</div>

			<div className="payment-grid">
				<article className="payment-panel" id="payment-methods">
					<div className="panel-heading payment-panel-heading">
						<div>
							<p className="eyebrow">Phương thức thanh toán</p>
							<h2>Chọn kênh phù hợp</h2>
						</div>
						<span className="payment-note">VNPay và MoMo mock đang hoạt động</span>
					</div>

					<div className="payment-methods">
						{paymentMethods.map((method) => {
							const Icon = method.icon
							const isActive = paymentMethod === method.key

							return (
								<button
									className={`payment-method ${isActive ? 'is-active' : ''} ${!method.enabled ? 'is-disabled' : ''}`}
									key={method.key}
									onClick={() => method.enabled && handlePay(method.key)}
									type="button"
									disabled={!method.enabled || isLoadingPayment || Boolean(processingMethod)}
								>
									<div className="payment-method-icon">
										<Icon />
									</div>
									<div className="payment-method-copy">
										<div className="payment-method-head">
											<strong>{method.title}</strong>
											<span>{method.badge}</span>
										</div>
										<p>{method.description}</p>
									</div>
									{processingMethod === method.key ? <LoadingOutlined /> : null}
								</button>
							)
						})}
					</div>

					{pageError && <p className="state-text error-text payment-message">{pageError}</p>}

					{isSuccess && (
						<div className="payment-banner success">
							<CheckCircleOutlined />
							<div>
								<strong>Thanh toán thành công</strong>
								<p>
									{paymentIdParam ? `Mã giao dịch ${paymentIdParam}.` : 'Đơn hàng đã được xác nhận.'}
									{payment?.transactionId ? ` Mã thanh toán ${payment.transactionId}.` : ''}
								</p>
							</div>
						</div>
					)}

					{isFail && (
						<div className="payment-banner fail">
							<ClockCircleOutlined />
							<div>
								<strong>Thanh toán chưa hoàn tất</strong>
								<p>{payment?.note || 'Giao dịch đã bị từ chối hoặc hết thời gian chờ.'}</p>
							</div>
						</div>
					)}

					{hasBookingData ? null : (
						<div className="payment-empty">
							<p className="state-text">Chưa có dữ liệu đơn hàng từ các bước trước.</p>
							<p className="state-text">
								Hãy quay lại chọn phim, suất chiếu và ghế để hệ thống tự điền toàn bộ thông tin ở đây.
							</p>
						</div>
					)}
				</article>

				<aside className="payment-panel payment-summary-panel">
					<div className="panel-heading">
						<div>
							<p className="eyebrow">Chi tiết đơn hàng</p>
							<h2>Tóm tắt thanh toán</h2>
						</div>
					</div>

					<div className="payment-summary-card">
						<div className="summary-row">
							<span>Khách hàng</span>
							<strong>{user?.fullName || 'Khách vãng lai'}</strong>
						</div>
						<div className="summary-row">
							<span>Email</span>
							<strong>{user?.email || 'Đang cập nhật'}</strong>
						</div>
						<div className="summary-row">
							<span>Booking code</span>
							<strong>{draft.bookingCode || bookingId || 'Đang cập nhật'}</strong>
						</div>
						<div className="summary-row">
							<span>Trạng thái payment</span>
							<strong>{payment?.status || paymentStatusParam || 'pending'}</strong>
						</div>
					</div>

					<div className="summary-breakdown">
						<div>
							<span>Tiền ghế</span>
							<strong>{formatCurrency(subtotal)}</strong>
						</div>
						<div>
							<span>Giảm giá</span>
							<strong>- {formatCurrency(discountAmount)}</strong>
						</div>
						<div className="summary-total">
							<span>Tổng thanh toán</span>
							<strong>{formatCurrency(finalAmount)}</strong>
						</div>
					</div>

					<div className="seat-preview">
						<div className="panel-heading compact-heading">
							<div>
								<p className="eyebrow">Danh sách ghế</p>
								<h2>Ghế đã chọn</h2>
							</div>
						</div>

						{seatSummary.length > 0 ? (
							<div className="seat-chips">
								{seatSummary.map((seat) => (
									<article className="seat-chip" key={`${seat.label}-${seat.type}`}>
										<strong>{seat.label}</strong>
										<span>{seat.type}</span>
										{typeof seat.price === 'number' && <small>{formatCurrency(seat.price)}</small>}
									</article>
								))}
							</div>
						) : (
							<p className="state-text">Chưa có ghế nào được lưu trong phiên hiện tại.</p>
						)}
					</div>

					{isLoadingPayment && <p className="state-text payment-loading"><LoadingOutlined /> Đang tải dữ liệu payment...</p>}
				</aside>
			</div>
		</section>
	)
}

export default Payment
