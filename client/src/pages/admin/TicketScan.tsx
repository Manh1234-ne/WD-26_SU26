import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  Row,
  Col,
  Input,
  Button,
  Alert,
  Typography,
  Tag,
  Space,
  Table,
  Spin,
  Badge,
  Divider,
  message,
} from "antd";
import {
  ScanOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  UserOutlined,
  VideoCameraOutlined,
  FieldTimeOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { Html5QrcodeScanner } from "html5-qrcode";
import { verifyTicketApi } from "../../features/ticketScan/ticketScan.service";
import type { TicketBooking } from "../../features/ticketScan/ticketScan.type";

const { Title, Text, Paragraph } = Typography;

interface ScannedHistoryItem {
  key: string;
  bookingCode: string;
  movieTitle: string;
  customerName: string;
  seats: string;
  scannedAt: string;
  status: "success" | "already_checked" | "error";
  message: string;
}

const TicketScan: React.FC = () => {
  const [qrInput, setQrInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: "idle" | "success" | "already_checked" | "error";
    message?: string;
    booking?: TicketBooking;
  }>({ status: "idle" });

  const [history, setHistory] = useState<ScannedHistoryItem[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const handleVerify = async (code: string) => {
    if (!code || !code.trim()) {
      message.warning("Vui lòng nhập dữ liệu mã QR");
      return;
    }

    setLoading(true);
    setScanResult({ status: "idle" });

    try {
      const res = await verifyTicketApi(code.trim());

      if (res.ok && res.booking) {
        setScanResult({
          status: "success",
          message: res.message || "Xác thực vé và check-in thành công!",
          booking: res.booking,
        });

        // Thêm vào lịch sử
        setHistory((prev) => [
          {
            key: `${res.booking!.id}-${Date.now()}`,
            bookingCode: res.booking!.bookingCode,
            movieTitle: res.booking!.movieTitle,
            customerName: res.booking!.customerName,
            seats: res.booking!.seats,
            scannedAt: new Date().toLocaleTimeString("vi-VN"),
            status: "success",
            message: "Check-in thành công",
          },
          ...prev,
        ]);
        message.success("Vé hợp lệ! Đã ghi nhận check-in.");
      } else {
        setScanResult({
          status: "error",
          message: res.message || "Mã QR không hợp lệ",
        });
        message.error(res.message || "Xác thực thất bại");
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err?.message || "Không thể xác thực mã QR";
      const isAlready =
        err?.response?.status === 409 || errorMsg.includes("check-in");

      setScanResult({
        status: isAlready ? "already_checked" : "error",
        message: errorMsg,
      });

      setHistory((prev) => [
        {
          key: `err-${Date.now()}`,
          bookingCode: "N/A",
          movieTitle: "N/A",
          customerName: "N/A",
          seats: "N/A",
          scannedAt: new Date().toLocaleTimeString("vi-VN"),
          status: isAlready ? "already_checked" : "error",
          message: errorMsg,
        },
        ...prev,
      ]);

      if (isAlready) {
        message.warning(errorMsg);
      } else {
        message.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Khởi tạo HTML5 QR Scanner
  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          handleVerify(decodedText);
          setIsScanning(false);
          scanner.clear().catch(() => { });
        },
        (_errorMessage) => {
          // ignore scan error frames
        }
      );

      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => { });
      }
    };
  }, [isScanning]);

  const handleResetScan = () => {
    setScanResult({ status: "idle" });
    setQrInput("");
    setIsScanning(true);
  };

  const columns = [
    {
      title: "Mã đơn hàng",
      dataIndex: "bookingCode",
      key: "bookingCode",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Tên phim",
      dataIndex: "movieTitle",
      key: "movieTitle",
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customerName",
    },
    {
      title: "Số ghế",
      dataIndex: "seats",
      key: "seats",
      render: (seats: string) => <Tag color="volcano">{seats}</Tag>,
    },
    {
      title: "Thời gian quét",
      dataIndex: "scannedAt",
      key: "scannedAt",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string, record: ScannedHistoryItem) => {
        if (status === "success")
          return <Tag color="success">Thành công</Tag>;
        if (status === "already_checked")
          return <Tag color="warning">Đã Check-in trước đó</Tag>;
        return <Tag color="error">{record.message || "Lỗi vé"}</Tag>;
      },
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Row gutter={[24, 24]}>
        {/* Cột Trái: Scanner Camera & Nhập Thủ Công */}
        <Col xs={24} lg={11}>
          <Card
            title={
              <Space>
                <ScanOutlined style={{ color: "#e11d48" }} />
                <span>Quét Mã QR Vé</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
          >
            {isScanning ? (
              <div>
                <div
                  id="qr-reader"
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px dashed #d9d9d9",
                  }}
                />
                <Text type="secondary" style={{ display: "block", marginTop: 12, textAlign: "center" }}>
                  Đưa mã QR vé vào trước camera để tự động quét
                </Text>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <CheckCircleOutlined style={{ fontSize: 48, color: "#52c41a", marginBottom: 12 }} />
                <Title level={4}>Đã tạm dừng camera</Title>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={handleResetScan}
                  style={{ backgroundColor: "#e11d48" }}
                >
                  Quét vé tiếp theo
                </Button>
              </div>
            )}

            <Divider style={{ margin: "20px 0" }}>Hoặc nhập mã thủ công</Divider>

            <Space.Compact style={{ width: "100%" }}>
              <Input
                placeholder="Dán hoặc nhập chuỗi Token QR..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onPressEnter={() => handleVerify(qrInput)}
                prefix={<QrcodeOutlined />}
              />
              <Button
                type="primary"
                loading={loading}
                onClick={() => handleVerify(qrInput)}
                style={{ backgroundColor: "#e11d48" }}
              >
                Xác thực
              </Button>
            </Space.Compact>
          </Card>
        </Col>

        {/* Cột Phải: Kết Quả Kiểm Tra */}
        <Col xs={24} lg={13}>
          <Card
            title={
              <Space>
                <AuditOutlined style={{ color: "#e11d48" }} />
                <span>Kết Quả Xác Thực Vé</span>
              </Space>
            }
            bordered={false}
            style={{ minHeight: 440, borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
          >
            {loading && (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <Spin size="large" />
                <Paragraph style={{ marginTop: 16 }}>Đang xác thực vé từ hệ thống...</Paragraph>
              </div>
            )}

            {!loading && scanResult.status === "idle" && (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#bfbfbf" }}>
                <QrcodeOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                <Title level={4} style={{ color: "#bfbfbf" }}>
                  Chưa quét vé nào
                </Title>
                <Text type="secondary">
                  Vui lòng quét QR bằng camera hoặc nhập mã token để kiểm tra vé.
                </Text>
              </div>
            )}

            {!loading && scanResult.status === "success" && scanResult.booking && (
              <div>
                <Alert
                  message="VÉ HỢP LỆ & CHECK-IN THÀNH CÔNG"
                  description={scanResult.message}
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined style={{ fontSize: 24 }} />}
                  style={{ marginBottom: 20, borderRadius: 8 }}
                />

                <Card
                  type="inner"
                  title={`Mã vé: ${scanResult.booking.bookingCode}`}
                  extra={<Tag color="green">ĐÃ DÙNG (CHECKED-IN)</Tag>}
                  style={{ borderRadius: 8 }}
                >
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <div>
                      <Text type="secondary"><VideoCameraOutlined /> Phim: </Text>
                      <Text strong style={{ fontSize: 16 }}>{scanResult.booking.movieTitle}</Text>
                    </div>

                    <div>
                      <Text type="secondary">Phòng chiếu: </Text>
                      <Tag color="blue" style={{ fontSize: 14 }}>{scanResult.booking.roomName}</Tag>
                    </div>

                    <div>
                      <Text type="secondary"><FieldTimeOutlined /> Suất chiếu: </Text>
                      <Text strong>
                        {scanResult.booking.showtime
                          ? new Date(scanResult.booking.showtime).toLocaleString("vi-VN")
                          : "N/A"}
                      </Text>
                    </div>

                    <div>
                      <Text type="secondary">Vị trí ghế: </Text>
                      <Tag color="volcano" style={{ fontSize: 15, padding: "2px 8px" }}>
                        {scanResult.booking.seats}
                      </Tag>
                    </div>

                    <Divider style={{ margin: "12px 0" }} />

                    <div>
                      <Text type="secondary"><UserOutlined /> Khách hàng: </Text>
                      <Text strong>{scanResult.booking.customerName}</Text>
                      {scanResult.booking.customerEmail && (
                        <Text type="secondary"> ({scanResult.booking.customerEmail})</Text>
                      )}
                    </div>

                    <div>
                      <Text type="secondary">Thời gian Check-in: </Text>
                      <Text type="success">
                        {scanResult.booking.checkedInAt
                          ? new Date(scanResult.booking.checkedInAt).toLocaleString("vi-VN")
                          : new Date().toLocaleString("vi-VN")}
                      </Text>
                    </div>
                  </Space>
                </Card>

                <div style={{ marginTop: 20, textAlign: "right" }}>
                  <Button type="primary" onClick={handleResetScan} style={{ backgroundColor: "#e11d48" }}>
                    Quét vé tiếp theo
                  </Button>
                </div>
              </div>
            )}

            {!loading && scanResult.status === "already_checked" && (
              <div>
                <Alert
                  message="CẢNH BÁO: VÉ ĐÃ ĐƯỢC CHECK-IN TRƯỚC ĐÓ!"
                  description={scanResult.message}
                  type="warning"
                  showIcon
                  icon={<ExclamationCircleOutlined style={{ fontSize: 24 }} />}
                  style={{ marginBottom: 20, borderRadius: 8 }}
                />
                <Button type="primary" onClick={handleResetScan} block style={{ backgroundColor: "#e11d48" }}>
                  Quét lại / Quét vé khác
                </Button>
              </div>
            )}

            {!loading && scanResult.status === "error" && (
              <div>
                <Alert
                  message="XÁC THỰC THẤT BẠI"
                  description={scanResult.message}
                  type="error"
                  showIcon
                  icon={<CloseCircleOutlined style={{ fontSize: 24 }} />}
                  style={{ marginBottom: 20, borderRadius: 8 }}
                />
                <Button type="primary" onClick={handleResetScan} block style={{ backgroundColor: "#e11d48" }}>
                  Thử lại / Quét vé khác
                </Button>
              </div>
            )}
          </Card>
        </Col>
        <Col span={24}>
          <Card
            title={
              <Space>
                <Badge count={history.length} overflowCount={99} style={{ backgroundColor: "#e11d48" }} />
                <span>Lịch Sử Quét Trong Phiên Làm Việc</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
          >
            <Table
              columns={columns}
              dataSource={history}
              pagination={{ pageSize: 5 }}
              locale={{ emptyText: "Chưa có lượt quét nào trong phiên này" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TicketScan;
