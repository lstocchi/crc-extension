/**********************************************************************
 * Copyright (C) 2025 Red Hat,
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import { expect, test, vi } from 'vitest';
import * as crcCli from './crc-cli.js';

test('getConfigValue parses value after colon, trims whitespace and lowercases it', async () => {
  vi.spyOn(crcCli, 'execPromise').mockResolvedValue('preset: OpenShift');
  const value = await crcCli.getConfigValue('preset');
  expect(value).toBe('openshift');
});

test('getConfigValue returns undefined if CLI fails', async () => {
  vi.spyOn(crcCli, 'execPromise').mockRejectedValue(new Error('crc not found'));
  const value = await crcCli.getConfigValue('preset');
  expect(value).toBeUndefined();
});

test('getConfigBoolean returns true for "true"', async () => {
  vi.spyOn(crcCli, 'execPromise').mockResolvedValue('skip-check-administrator-user: true');
  const value = await crcCli.getConfigBoolean('skip-check-administrator-user');
  expect(value).toBe(true);
});

test('getConfigBoolean returns false for "false"', async () => {
  vi.spyOn(crcCli, 'execPromise').mockResolvedValue('some-bool: false');
  const value = await crcCli.getConfigBoolean('some-bool', true);
  expect(value).toBe(false);
});

test('getConfigBoolean returns default when value is not boolean', async () => {
  vi.spyOn(crcCli, 'execPromise').mockResolvedValue('');
  const value = await crcCli.getConfigBoolean('some-bool', true);
  expect(value).toBe(true);
});

test('getConfigBoolean returns default when value is undefined', async () => {
  vi.spyOn(crcCli, 'execPromise').mockRejectedValue(new Error('crc not found'));
  const value = await crcCli.getConfigBoolean('some-bool');
  expect(value).toBe(false);
});

test('getPreset returns a valid preset value', async () => {
  vi.spyOn(crcCli, 'execPromise').mockResolvedValue('preset: microshift');
  const value = await crcCli.getPreset();
  expect(value).toBe('microshift');
});

test('getPreset returns undefined when preset is unknown', async () => {
  vi.spyOn(crcCli, 'execPromise').mockResolvedValue('preset: unknown');
  const value = await crcCli.getPreset();
  expect(value).toBeUndefined();
});

test('sets config to true when current value is false, and restore sets it to false', async () => {
  const spy = vi.spyOn(crcCli, 'execPromise');
  // First call (config get) returns false, then subsequent sets succeed
  spy
    .mockResolvedValueOnce('skip-check-administrator-user: false') // get
    .mockResolvedValueOnce('') // set true
    .mockResolvedValueOnce(''); // set false (restore)

  const restore = await crcCli.enableSkipAdministratorCheckBypass();

  // First call should be config get
  expect(spy).toHaveBeenNthCalledWith(1, 'crc.exe', ['config', 'get', 'skip-check-administrator-user'], undefined);
  // Second call should set to true
  expect(spy).toHaveBeenNthCalledWith(
    2,
    'crc.exe',
    ['config', 'set', 'skip-check-administrator-user', 'true'],
    undefined,
  );

  await restore();
  // Third call should set to false (restore)
  expect(spy).toHaveBeenNthCalledWith(
    3,
    'crc.exe',
    ['config', 'set', 'skip-check-administrator-user', 'false'],
    undefined,
  );
});

test('does not set config to true when current value is already true; restore is a no-op', async () => {
  const spy = vi.spyOn(crcCli, 'execPromise');
  // First call (config get) returns true
  spy.mockResolvedValueOnce('skip-check-administrator-user: true');

  const restore = await crcCli.enableSkipAdministratorCheckBypass();
  // Only the config get should be called
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith('crc.exe', ['config', 'get', 'skip-check-administrator-user'], undefined);

  await restore();
  // No additional calls on restore as nothing changed
  expect(spy).toHaveBeenCalledTimes(1);
});
