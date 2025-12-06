// components/simple-connect-button.tsx
import { ConnectButton, darkTheme } from "thirdweb/react";
import { client as sharedClient } from "@/lib/thirdweb";
import { createWallet } from "thirdweb/wallets";
import { base } from "thirdweb/chains";

// Use shared client configured via env (no insecure fallbacks)
const client = sharedClient;

// Define available wallets
const wallets = [
  createWallet("com.coinbase.wallet"),
  createWallet("io.metamask"),
  createWallet("walletConnect"),
  createWallet("com.trustwallet.app"),
];

// Simple ConnectButton component (no SIWE authentication)
export default function SimpleConnectButton() {
  return (
    <ConnectButton
      client={client}
      chains={[base]}
      connectButton={{ label: "CONNECT" }}
      connectModal={{
        privacyPolicyUrl: "https://retinaldelights.io/privacy",
        size: "compact",
        termsOfServiceUrl: "https://retinaldelights.io/terms",
      }}
      theme={darkTheme({
        colors: {
          accentText: "hsl(324, 100%, 50%)",
          accentButtonBg: "hsl(324, 100%, 50%)",
          danger: "hsl(0, 100%, 55%)",
          success: "hsl(142, 92%, 53%)",
          tooltipText: "hsl(48, 100%, 96%)",
          primaryText: "hsl(48, 100%, 96%)",
          selectedTextBg: "hsl(48, 100%, 96%)",
          primaryButtonBg: "hsl(324, 100%, 50%)",
          secondaryButtonText: "hsl(48, 100%, 96%)",
          accentButtonText: "hsl(48, 100%, 96%)",
          secondaryIconHoverColor: "hsl(48, 100%, 96%)",
          modalBg: "hsl(0, 0%, 2%)",
          borderColor: "hsl(324, 100%, 50%)",
          separatorLine: "hsl(0, 0%, 15%)",
          tertiaryBg: "hsl(0, 0%, 4%)",
          skeletonBg: "hsl(0, 0%, 15%)",
          secondaryText: "hsl(48, 100%, 96%)",
          secondaryButtonBg: "hsl(0, 0%, 9%)",
          secondaryButtonHoverBg: "hsl(0, 0%, 9%)",
          connectedButtonBg: "hsl(0, 0%, 4%)",
          connectedButtonBgHover: "hsl(0, 0%, 9%)",
          secondaryIconColor: "hsl(218, 11%, 65%)",
          scrollbarBg: "hsl(0, 0%, 9%)",
          inputAutofillBg: "hsl(0, 0%, 9%)",
          tooltipBg: "hsl(0, 0%, 9%)",
          secondaryIconHoverBg: "hsl(0, 0%, 9%)",
          primaryButtonText: "hsl(48, 100%, 96%)",
        },
      })}
      wallets={wallets}
    />
  );
}
