import { Computer, FileKey2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import Code from "~/components/Code";
import Dialog from "~/components/Dialog";
import Input from "~/components/Input";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "~/components/menu";
import Select from "~/components/Select";
import type { User } from "~/types";
import { getUserDisplayName } from "~/utils/user";

export interface NewMachineProps {
  server: string;
  users: User[];
  isDisabled?: boolean;
  disabledKeys?: string[];
}

export default function NewMachine(data: NewMachineProps) {
  const [pushDialog, setPushDialog] = useState(false);
  const [authId, setAuthId] = useState("");
  const navigate = useNavigate();

  const trimmedAuthId = authId.trim();
  const normalizedAuthId =
    trimmedAuthId.match(/(hskey-authreq-[A-Za-z0-9_-]{24})$/)?.[1] ??
    trimmedAuthId.match(/([A-Za-z0-9_-]{24})$/)?.[1] ??
    "";
  const isAuthIdInvalid = authId.length > 0 && normalizedAuthId.length === 0;

  return (
    <>
      <Dialog isOpen={pushDialog} onOpenChange={setPushDialog}>
        <Dialog.Panel isDisabled={normalizedAuthId.length === 0}>
          <Dialog.Title>Register device from auth code</Dialog.Title>
          <Dialog.Text className="mb-4">
            Paste the Headscale registration URL or auth request ID shown after you run{" "}
            <Code isCopyable>tailscale up --login-server={data.server}</Code> on your device.
          </Dialog.Text>
          <input name="action_id" type="hidden" value="register" />
          <input name="register_key" type="hidden" value={normalizedAuthId} />
          <Input
            description="Accepts the full /register/ URL, the full hskey-authreq-... value, or the 24-character code shown by the client."
            errorMessage="Enter a valid Headscale auth request ID."
            isInvalid={isAuthIdInvalid}
            isRequired
            label="Registration code"
            onChange={setAuthId}
            placeholder="hskey-authreq-... or 24-character code"
            validationBehavior="native"
            value={authId}
          />
          <Select isRequired label="Owner" name="user" placeholder="Select a user">
            {data.users.map((user) => (
              <Select.Item key={user.id}>{getUserDisplayName(user)}</Select.Item>
            ))}
          </Select>
        </Dialog.Panel>
      </Dialog>
      <Menu disabled={data.isDisabled}>
        <MenuTrigger className="rounded-md bg-indigo-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500/90 dark:bg-indigo-500/90 dark:hover:bg-indigo-500/80">
          Add Device
        </MenuTrigger>
        <MenuContent>
          <MenuItem
            disabled={data.disabledKeys?.includes("register")}
            onClick={() => setPushDialog(true)}
          >
            <div className="flex items-center gap-x-3">
              <Computer className="w-4" />
              Register from auth code
            </div>
          </MenuItem>
          <MenuItem
            disabled={data.disabledKeys?.includes("pre-auth")}
            onClick={() => navigate("/settings/auth-keys")}
          >
            <div className="flex items-center gap-x-3">
              <FileKey2 className="w-4" />
              Generate Pre-auth Key
            </div>
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );
}
