import { isAddress } from 'ethers';
import { getNetworkConfig } from '../config/networks.js';
import { HttpError } from '../middleware/error.js';

export function assertSupportedNetwork(network?: string) {
  if (!network) throw new HttpError(400, 'network is required');
  const cfg = getNetworkConfig(network);
  if (!cfg) throw new HttpError(400, `unsupported network: ${network}`);
}

export function assertValidAddress(address?: string, fieldName = 'address') {
  if (!address) throw new HttpError(400, `${fieldName} is required`);
  if (!isAddress(address)) throw new HttpError(400, `${fieldName} is not a valid address`);
}
