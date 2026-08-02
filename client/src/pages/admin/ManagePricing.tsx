import React, { useEffect, useState } from 'react'
import {
    Table, Button, Space, Modal, Form, Input, Select,
    InputNumber, Switch, DatePicker, TimePicker, message,
    Card, Typography, Tag, Popconfirm
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PercentageOutlined, DollarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
dayjs.extend(customParseFormat)
import {
    getAllPricingRules, createPricingRule, updatePricingRule, deletePricingRule
} from '../../features/pricing/pricing.service'
import type { PricingRule, CreatePricingRulePayload } from '../../features/pricing/pricing.type'

const { Title } = Typography
const { Option } = Select

export default function ManagePricing() {
    const [rules, setRules] = useState<PricingRule[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
    const [form] = Form.useForm()
    const ruleType = Form.useWatch('ruleType', form)
    const holidayType = Form.useWatch('holidayType', form)

    const fetchRules = async () => {
        setIsLoading(true)
        try {
            const data = await getAllPricingRules()
            setRules(data)
        } catch (error) {
            console.error(error)
            void message.error('Không thể tải danh sách quy tắc giá')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        void fetchRules()
    }, [])

    const handleOpenModal = (rule?: PricingRule) => {
        if (rule) {
            setEditingRule(rule)
            form.setFieldsValue({
                name: rule.name,
                ruleType: rule.ruleType,
                surchargePercentage: rule.surchargePercentage,
                isActive: rule.isActive,
                timeRange: rule.startTime && rule.endTime ? [dayjs(rule.startTime, 'HH:mm'), dayjs(rule.endTime, 'HH:mm')] : undefined,
                holidayType: rule.endDate ? 'range' : 'single',
                date: rule.date && !rule.endDate ? dayjs(rule.date) : undefined,
                dateRange: rule.date && rule.endDate ? [dayjs(rule.date), dayjs(rule.endDate)] : undefined
            })
        } else {
            setEditingRule(null)
            form.resetFields()
            form.setFieldsValue({ isActive: true, ruleType: 'weekend', holidayType: 'single' })
        }
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        form.resetFields()
        setEditingRule(null)
    }

    const handleSubmit = async (values: any) => {
        try {
            const payload: CreatePricingRulePayload = {
                name: values.name,
                ruleType: values.ruleType,
                surchargePercentage: values.surchargePercentage,
                isActive: values.isActive
            }

            if (values.ruleType === 'peak_hour') {
                if (!values.timeRange || values.timeRange.length !== 2) {
                    void message.error('Vui lòng chọn khung giờ')
                    return
                }
                payload.startTime = values.timeRange[0].format('HH:mm')
                payload.endTime = values.timeRange[1].format('HH:mm')
            }

            if (values.ruleType === 'holiday') {
                if (values.holidayType === 'single') {
                    if (!values.date) {
                        void message.error('Vui lòng chọn ngày lễ')
                        return
                    }
                    payload.date = values.date.toISOString()
                    payload.endDate = undefined
                } else if (values.holidayType === 'range') {
                    if (!values.dateRange || values.dateRange.length !== 2) {
                        void message.error('Vui lòng chọn khoảng ngày lễ')
                        return
                    }
                    payload.date = values.dateRange[0].toISOString()
                    payload.endDate = values.dateRange[1].toISOString()
                }
            }

            if (editingRule) {
                await updatePricingRule(editingRule._id, payload)
                void message.success('Cập nhật quy tắc thành công')
            } else {
                await createPricingRule(payload)
                void message.success('Tạo quy tắc mới thành công')
            }
            handleCloseModal()
            void fetchRules()
        } catch (error: any) {
            console.error(error)
            void message.error(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại')
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deletePricingRule(id)
            void message.success('Xóa quy tắc thành công')
            void fetchRules()
        } catch (error) {
            console.error(error)
            void message.error('Lỗi khi xóa quy tắc')
        }
    }

    const handleToggleStatus = async (checked: boolean, record: PricingRule) => {
        try {
            await updatePricingRule(record._id, { isActive: checked })
            void message.success('Cập nhật trạng thái thành công')
            void fetchRules()
        } catch (error) {
            void message.error('Lỗi cập nhật trạng thái')
        }
    }

    const columns = [
        {
            title: 'Tên Quy Tắc',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <strong style={{ color: '#0f172a' }}>{text}</strong>
        },
        {
            title: 'Loại',
            dataIndex: 'ruleType',
            key: 'ruleType',
            render: (type: string) => {
                if (type === 'weekend') return <Tag color="blue">Cuối tuần (T7, CN)</Tag>
                if (type === 'peak_hour') return <Tag color="orange">Giờ cao điểm</Tag>
                if (type === 'holiday') return <Tag color="magenta">Ngày Lễ</Tag>
                return <Tag>{type}</Tag>
            }
        },
        {
            title: 'Mức Phụ Thu',
            dataIndex: 'surchargePercentage',
            key: 'surchargePercentage',
            render: (val: number) => (
                <span style={{ color: '#e11d48', fontWeight: 600 }}>+{val}%</span>
            )
        },
        {
            title: 'Điều Kiện (Thời gian)',
            key: 'condition',
            render: (_: any, record: PricingRule) => {
                if (record.ruleType === 'peak_hour') {
                    return <span>{record.startTime} - {record.endTime}</span>
                }
                if (record.ruleType === 'holiday') {
                    if (record.endDate && record.date) {
                        return <span>{dayjs(record.date).format('DD/MM/YYYY')} - {dayjs(record.endDate).format('DD/MM/YYYY')}</span>
                    }
                    if (record.date) {
                        return <span>{dayjs(record.date).format('DD/MM/YYYY')}</span>
                    }
                }
                return <span style={{ color: '#94a3b8' }}>Không có</span>
            }
        },
        {
            title: 'Trạng Thái',
            key: 'isActive',
            render: (_: any, record: PricingRule) => (
                <Switch 
                    checked={record.isActive} 
                    onChange={(checked) => handleToggleStatus(checked, record)}
                    checkedChildren="Bật"
                    unCheckedChildren="Tắt"
                />
            )
        },
        {
            title: 'Thao Tác',
            key: 'action',
            render: (_: any, record: PricingRule) => (
                <Space>
                    <Button 
                        type="text" 
                        icon={<EditOutlined />} 
                        onClick={() => handleOpenModal(record)}
                    />
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa quy tắc này?"
                        onConfirm={() => handleDelete(record._id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ]

    return (
        <div style={{ padding: '24px' }}>
            <Card
                bordered={false}
                style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                title={
                    <Space>
                        <DollarOutlined style={{ fontSize: '24px', color: '#059669' }} />
                        <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                            Quản Lý Giá Vé (Phụ Thu)
                        </Title>
                    </Space>
                }
                extra={
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        style={{ background: '#059669', borderColor: '#059669' }}
                        onClick={() => handleOpenModal()}
                    >
                        Thêm Quy Tắc
                    </Button>
                }
            >
                <div style={{ marginBottom: 16, padding: '12px 16px', background: '#ecfdf5', borderRadius: 8, color: '#065f46' }}>
                    <strong>Lưu ý:</strong> Các quy tắc giá (phụ thu % vé) chỉ áp dụng lên giá của suất chiếu. Nếu một suất chiếu rơi vào nhiều quy tắc (ví dụ vừa cuối tuần vừa giờ cao điểm), hệ thống sẽ tính tổng phần trăm của tất cả quy tắc để nhân lên.
                </div>
                <Table
                    columns={columns}
                    dataSource={rules}
                    rowKey="_id"
                    loading={isLoading}
                    pagination={false}
                />
            </Card>

            <Modal
                title={
                    <Space>
                        <PercentageOutlined style={{ color: '#059669' }} />
                        <span>{editingRule ? 'Chỉnh Sửa Quy Tắc Giá' : 'Thêm Quy Tắc Giá Mới'}</span>
                    </Space>
                }
                open={isModalOpen}
                onCancel={handleCloseModal}
                onOk={() => form.submit()}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        label="Tên Quy Tắc (vd: Phụ thu cuối tuần, Ngày lễ 30/4...)"
                        name="name"
                        rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                    >
                        <Input placeholder="Nhập tên quy tắc" />
                    </Form.Item>

                    <Form.Item
                        label="Loại Phụ Thu"
                        name="ruleType"
                        rules={[{ required: true, message: 'Vui lòng chọn loại' }]}
                    >
                        <Select>
                            <Option value="weekend">Cuối Tuần (Thứ 7, Chủ Nhật)</Option>
                            <Option value="peak_hour">Giờ Cao Điểm</Option>
                            <Option value="holiday">Ngày Lễ</Option>
                        </Select>
                    </Form.Item>

                    {ruleType === 'peak_hour' && (
                        <Form.Item
                            label="Khung Giờ Cao Điểm"
                            name="timeRange"
                            rules={[{ required: true, message: 'Vui lòng chọn giờ' }]}
                        >
                            <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
                        </Form.Item>
                    )}

                    {ruleType === 'holiday' && (
                        <Form.Item
                            label="Kiểu ngày lễ"
                            name="holidayType"
                            rules={[{ required: true }]}
                        >
                            <Select>
                                <Option value="single">Một ngày cụ thể</Option>
                                <Option value="range">Nhiều ngày (Khoảng thời gian)</Option>
                            </Select>
                        </Form.Item>
                    )}

                    {ruleType === 'holiday' && holidayType === 'single' && (
                        <Form.Item
                            label="Chọn Ngày Lễ"
                            name="date"
                            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                        >
                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                        </Form.Item>
                    )}

                    {ruleType === 'holiday' && holidayType === 'range' && (
                        <Form.Item
                            label="Chọn Khoảng Ngày Lễ"
                            name="dateRange"
                            rules={[{ required: true, message: 'Vui lòng chọn khoảng ngày' }]}
                        >
                            <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                        </Form.Item>
                    )}

                    <Form.Item
                        label="Mức Tăng Giá (%)"
                        name="surchargePercentage"
                        rules={[{ required: true, message: 'Vui lòng nhập %' }]}
                    >
                        <InputNumber 
                            min={0} 
                            max={200} 
                            style={{ width: '100%' }} 
                            addonAfter="%" 
                            placeholder="Ví dụ: 20"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Trạng Thái"
                        name="isActive"
                        valuePropName="checked"
                    >
                        <Switch checkedChildren="Đang Bật" unCheckedChildren="Tạm Tắt" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
