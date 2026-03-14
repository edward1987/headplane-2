import Attribute from "~/components/Attribute";
import Dialog from "~/components/Dialog";
import type { PreAuthKey, User } from "~/types";
import { getUserDisplayName } from "~/utils/user";

import ExpireAuthKey from "./dialogs/expire-auth-key";

interface Props {
  authKey: PreAuthKey;
  user: User | null;
}

export default function AuthKeyRow({ authKey, user }: Props) {
  const createdAt = new Date(authKey.createdAt).toLocaleString();
  const expiration = new Date(authKey.expiration).toLocaleString();
  const isExpired =
    (authKey.used && !authKey.reusable) || new Date(authKey.expiration) < new Date();
  const userDisplay = user ? getUserDisplayName(user) : "(Tag Only)";

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
