import type { PaymentType } from "@/lib/paymentMethods";

export type Locale = "ja" | "en";

export const DEFAULT_LOCALE: Locale = "ja";
export const LOCALE_STORAGE_KEY = "cowork-square.locale";

type PaymentCopy = {
  label: string;
  description: string;
};

type Messages = {
  langJa: string;
  langEn: string;
  switchLanguage: string;
  loadingCatalog: string;
  catalogUnavailable: string;
  unknownError: string;
  genericError: string;
  catalogLoadFailed: string;
  catalogFetchFailed: string;
  catalogNoPricedItems: string;
  catalogVariationNotFound: string;
  catalogItemNotFound: string;
  catalogMultipleItems: string;
  checkoutStartFailed: string;
  checkoutIdMissing: string;
  checkoutStatusFailed: string;
  checkoutCancelFailed: string;
  reload: string;
  cart: string;
  perUnitTapToAdd: string;
  quantity: string;
  decreaseQuantity: string;
  increaseQuantity: string;
  total: string;
  continueToPayment: string;
  paymentMethods: string;
  changeQuantity: string;
  processing: string;
  preparingPayment: string;
  statusPending: string;
  statusInProgress: string;
  statusCompleted: string;
  statusCanceled: string;
  statusCancelRequested: string;
  statusProcessing: string;
  thankYou: string;
  paymentComplete: string;
  paymentCanceled: string;
  returningToStart: string;
  startOver: string;
  canceling: string;
  payments: Record<PaymentType, PaymentCopy>;
};

export const messages: Record<Locale, Messages> = {
  ja: {
    langJa: "日本語",
    langEn: "EN",
    switchLanguage: "言語",
    loadingCatalog: "商品情報を読み込んでいます…",
    catalogUnavailable: "商品を表示できません",
    unknownError: "不明なエラー",
    genericError: "エラーが発生しました",
    catalogLoadFailed: "商品の読み込みに失敗しました",
    catalogFetchFailed: "商品情報の取得に失敗しました",
    catalogNoPricedItems:
      "Square カタログに価格付きの商品がありません。Square 管理画面で商品を確認してください。",
    catalogVariationNotFound:
      "指定した NEXT_PUBLIC_CATALOG_VARIATION_ID の商品が見つかりません",
    catalogItemNotFound:
      "指定した NEXT_PUBLIC_CATALOG_ITEM_ID の商品が見つかりません",
    catalogMultipleItems:
      "カタログに複数商品があります。.env に NEXT_PUBLIC_CATALOG_ITEM_ID を設定してください。",
    checkoutStartFailed: "決済の開始に失敗しました",
    checkoutIdMissing: "決済 ID を取得できませんでした",
    checkoutStatusFailed: "決済状態の確認に失敗しました",
    checkoutCancelFailed: "決済のキャンセルに失敗しました",
    reload: "再読み込み",
    cart: "カート",
    perUnitTapToAdd: "/ 単位 · タップで追加",
    quantity: "数量",
    decreaseQuantity: "数量を減らす",
    increaseQuantity: "数量を増やす",
    total: "合計",
    continueToPayment: "お支払いへ進む",
    paymentMethods: "お支払い方法",
    changeQuantity: "数量を変更する",
    processing: "決済中",
    preparingPayment: "決済を準備しています…",
    statusPending: "端末で決済を開始しています…",
    statusInProgress: "決済処理中です。端末の指示に従ってください",
    statusCompleted: "決済が完了しました",
    statusCanceled: "決済がキャンセルされました",
    statusCancelRequested: "キャンセル処理中…",
    statusProcessing: "処理中…",
    thankYou: "ありがとうございました",
    paymentComplete: "決済が完了しました",
    paymentCanceled: "キャンセルされました",
    returningToStart: "最初の画面に戻ります…",
    startOver: "はじめからやり直す",
    canceling: "キャンセルしています…",
    payments: {
      FELICA_TRANSPORTATION_GROUP: {
        label: "交通系 IC",
        description: "Suica / PASMO など",
      },
      QR_CODE: {
        label: "QR コード決済",
        description: "PayPay など",
      },
      CARD_PRESENT: {
        label: "クレジット・デビット",
        description: "タッチ / 挿入",
      },
      FELICA_ID: {
        label: "iD",
        description: "",
      },
      FELICA_QUICPAY: {
        label: "QUICPay",
        description: "",
      },
    },
  },
  en: {
    langJa: "日本語",
    langEn: "EN",
    switchLanguage: "Language",
    loadingCatalog: "Loading product…",
    catalogUnavailable: "Unable to show product",
    unknownError: "Unknown error",
    genericError: "Something went wrong",
    catalogLoadFailed: "Failed to load product",
    catalogFetchFailed: "Failed to fetch product information",
    catalogNoPricedItems:
      "No priced items found in the Square catalog. Check the item in the Square Dashboard.",
    catalogVariationNotFound:
      "The item for NEXT_PUBLIC_CATALOG_VARIATION_ID was not found",
    catalogItemNotFound:
      "The item for NEXT_PUBLIC_CATALOG_ITEM_ID was not found",
    catalogMultipleItems:
      "Multiple catalog items found. Set NEXT_PUBLIC_CATALOG_ITEM_ID in .env.",
    checkoutStartFailed: "Failed to start payment",
    checkoutIdMissing: "Could not get a payment ID",
    checkoutStatusFailed: "Failed to check payment status",
    checkoutCancelFailed: "Failed to cancel payment",
    reload: "Reload",
    cart: "Cart",
    perUnitTapToAdd: "/ unit · tap to add",
    quantity: "Quantity",
    decreaseQuantity: "Decrease quantity",
    increaseQuantity: "Increase quantity",
    total: "Total",
    continueToPayment: "Continue to payment",
    paymentMethods: "Payment method",
    changeQuantity: "Change quantity",
    processing: "Processing payment",
    preparingPayment: "Preparing payment…",
    statusPending: "Starting payment on the terminal…",
    statusInProgress: "Follow the instructions on the terminal",
    statusCompleted: "Payment complete",
    statusCanceled: "Payment canceled",
    statusCancelRequested: "Canceling…",
    statusProcessing: "Processing…",
    thankYou: "Thank you",
    paymentComplete: "Payment complete",
    paymentCanceled: "Canceled",
    returningToStart: "Returning to the start screen…",
    startOver: "Start over",
    canceling: "Canceling…",
    payments: {
      FELICA_TRANSPORTATION_GROUP: {
        label: "Transit IC",
        description: "Suica / PASMO, etc.",
      },
      QR_CODE: {
        label: "QR code",
        description: "PayPay, etc.",
      },
      CARD_PRESENT: {
        label: "Credit / Debit",
        description: "Tap / Insert",
      },
      FELICA_ID: {
        label: "iD",
        description: "",
      },
      FELICA_QUICPAY: {
        label: "QUICPay",
        description: "",
      },
    },
  },
};

export function isLocale(value: string | null): value is Locale {
  return value === "ja" || value === "en";
}

const ENTRY_FEE_CATALOG_NAME = "入場料";

export function displayProductName(name: string, locale: Locale): string {
  if (locale === "en" && name.trim() === ENTRY_FEE_CATALOG_NAME) {
    return "Entry Fee";
  }
  return name;
}

export function formatMoney(
  amount: number,
  currency: string,
  locale: Locale,
): string {
  return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function resolveMessage(
  t: Messages,
  key: string | null,
  fallback: string,
): string {
  if (!key) return fallback;
  if (Object.hasOwn(t, key)) {
    const value = t[key as keyof Messages];
    if (typeof value === "string") return value;
  }
  return key;
}

export function statusMessage(t: Messages, status: string): string {
  switch (status) {
    case "PREPARING":
      return t.preparingPayment;
    case "PENDING":
      return t.statusPending;
    case "IN_PROGRESS":
      return t.statusInProgress;
    case "COMPLETED":
      return t.statusCompleted;
    case "CANCELED":
      return t.statusCanceled;
    case "CANCEL_REQUESTED":
      return t.statusCancelRequested;
    default:
      return t.statusProcessing;
  }
}
