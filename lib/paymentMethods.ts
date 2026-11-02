export type PaymentType =
  | "CARD_PRESENT"
  | "FELICA_TRANSPORTATION_GROUP"
  | "FELICA_ID"
  | "FELICA_QUICPAY"
  | "QR_CODE";

export type PaymentMethodOption = {
  type: PaymentType;
  label: string;
  description: string;
};

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    type: "FELICA_TRANSPORTATION_GROUP",
    label: "交通系 IC",
    description: "Suica / PASMO など",
  },
  {
    type: "QR_CODE",
    label: "QR コード決済",
    description: "PayPay など",
  },
  {
    type: "CARD_PRESENT",
    label: "クレジット・デビット",
    description: "タッチ / 挿入",
  },
  {
    type: "FELICA_ID",
    label: "iD",
    description: "",
  },
  {
    type: "FELICA_QUICPAY",
    label: "QUICPay",
    description: "",
  },
];
