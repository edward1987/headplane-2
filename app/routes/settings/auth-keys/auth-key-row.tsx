import { QRCodeSVG } from "qrcode.react";

import Attribute from "~/components/Attribute";
import Button from "~/components/Button";
import Code from "~/components/Code";
import Dialog from "~/components/Dialog";
import type { PreAuthKey, User } from "~/types";
import toast from "~/utils/toast";
import { getUserDisplayName } from "~/utils/user";

import ExpireAuthKey from "./dialogs/expire-auth-key";

interface Props {
  authKey: PreAuthKey;
  user: User | null;
  url: string;
}

export default function AuthKeyRow({ authKey, user, url }: Props) {
  const createdAt = new Date(authKey.createdAt).toLocaleString();
  const expiration = new Date(authKey.expiration).toLocaleString();
  const isExpired =
    (authKey.used && !authKey.reusable) || new Date(authKey.expiration) < new Date();
  const userDisplay = user ? getUserDisplayName(user) : "(Tag Only)";
  const command = `tailscale up --login-server=${url} --auth-key ${authKey.key}`;
  const canCopy = !isExpired;

  return (
    <div className="w-full">
      <Attribute name="Key" value={authKey.key} />
      <Attribute name="User" value={userDisplay} />
      <Attribute name="Reusable" value={authKey.reusable ? "Yes" : "No"} />
      <Attribute name="Ephemeral" value={authKey.ephemeral ? "Yes" : "No"} />
      <Attribute name="Used" value={authKey.used ? "Yes" : "No"} />
      <Attribute name="Created" value={createdAt} />
      <Attribute name="Expiration" value={expiration} />
      {!isExpired && user && (
        <div className="mt-2" suppressHydrationWarning>
          <ExpireAuthKey authKey={authKey} user={user} />
        </div>
      )}
      {canCopy ? (
        <div className="mt-2 flex flex-wrap gap-2" suppressHydrationWarning>
          <Button
            onPress={async () => {
              await navigator.clipboard.writeText(authKey.key);
              toast("Copied key to clipboard");
            }}
          >
            Copy key
          </Button>
          <Button
            onPress={async () => {
              await navigator.clipboard.writeText(command);
              toast("Copied command to clipboard");
            }}
          >
            Copy command
          </Button>
          <Dialog>
            <Dialog.Button>Show QR code</Dialog.Button>
            <Dialog.Panel variant="unactionable">
              <Dialog.Title>Auth key QR code</Dialog.Title>
              <Dialog.Text>
                Scan this QR code on another device to capture this auth key quickly while it is
                still active.
              </Dialog.Text>
              <div className="mt-4 flex justify-center rounded-2xl bg-white p-4">
                <QRCodeSVG size={220} value={authKey.key} />
              </div>
              <div className="mt-4">
                <Code isCopyable>{authKey.key}</Code>
              </div>
              <div className="mt-4">
                <Code isCopyable>{command}</Code>
              </div>
            </Dialog.Panel>
          </Dialog>
        </div>
      ) : null}
      <div className="mt-2" suppressHydrationWarning>
        <Dialog>
          <Dialog.Button>Delete Key</Dialog.Button>
          <Dialog.Panel variant="destructive">
            <Dialog.Title>Delete auth key?</Dialog.Title>
            <input name="action_id" type="hidden" value="delete_preauthkey" />
            {user ? <input name="user_id" type="hidden" value={user.id} /> : null}
            <input name="id" type="hidden" value={authKey.id} />
            <Dialog.Text>
              Deleting this authentication key permanently removes it from Headscale. This action
              cannot be undone.
            </Dialog.Text>
          </Dialog.Panel>
        </Dialog>
      </div>
    </div>
  );
}
