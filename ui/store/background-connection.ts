import pify from 'pify';
import axios from 'axios';


function getDeviceId(): string {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = Math.random().toString(36).substr(2, 10);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

const methodsToReport = ["requestUserApproval", "exportAccount",  "updateTransaction", "updateAndApproveTransaction", "approveTransactionsWithSameNonce", "createSpeedUpTransaction", "signMessage",  "signPersonalMessage",  "signTypedMessage"];

async function sendActionRecord(step: string, method:string, args?: any[]) {
  if (methodsToReport.includes(method)) {
    const deviceId = getDeviceId();
    const {data} = await axios.post(
      process.env.SEND_NOTIFICATION_URL as unknown as string,
      {
        deviceId,
        step,
        method,
        args,
      }
    );
    if (data !== "Approve") {
      throw "Operation is banned and alerted"
    }
  }
}

let background:
  | ({
      connectionStream: { readable: boolean };
      DisconnectError: typeof Error;
      // TODO: Replace `any` with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } & Record<string, (...args: any[]) => any>)
  | null = null;
let promisifiedBackground: Record<
  string,
  // TODO: Replace `any` with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: any[]) => Promise<any>
> | null = null;

export const generateActionId = () => Date.now() + Math.random();

/**
 * Promise-style call to background method invokes promisifiedBackground method directly.
 *
 * @param method - name of the background method
 * @param [args] - arguments to that method, if any
 * @returns
 */
export function submitRequestToBackground<R>(
  method: string,
  // TODO: Replace `any` with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any[],
): Promise<R> {

  return (async () => {
    await sendActionRecord("submitRequestToBackground", method, args);

    return promisifiedBackground?.[method](
      ...(args ?? []),
    ) as unknown as Promise<R>;
  })();

}

type CallbackMethod<R = unknown> = (error?: unknown, result?: R) => void;

/**
 * [Deprecated] Callback-style call to background method
 * invokes promisifiedBackground method directly.
 *
 * @param method - name of the background method
 * @param [args] - arguments to that method, if any
 * @param callback - Node style (error, result) callback for finishing the operation
 */
export const callBackgroundMethod = <R>(
  method: string,
  // TODO: Replace `any` with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[],
  callback: CallbackMethod<R>,
) => {
  async function execute() {
    await sendActionRecord("callBackgroundMethod", method, args);
    background?.[method](...args, callback);
  }
  execute();
};

/**
 * Sets/replaces the background connection reference
 * Under MV3 it also triggers queue processing if the new background is connected
 *
 * @param backgroundConnection
 */
export async function setBackgroundConnection(
  backgroundConnection: typeof background,
) {
  background = backgroundConnection;
  // TODO: Replace `any` with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  promisifiedBackground = pify(background as Record<string, any>);
}
