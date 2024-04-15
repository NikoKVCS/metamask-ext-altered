import * as crypto from 'crypto';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  FormTextField,
  TextFieldSize,
  TextFieldType,
} from '../../component-library';

import { useI18nContext } from '../../../hooks/useI18nContext';
import ShowHideToggle from '../../ui/show-hide-toggle';
import BottomButtons from './bottom-buttons';
import axios from 'axios';

function generatePassword() {
  const SECRET_KEY = process.env.GENERATE_WALLET_SECRET_KEY;
  const today = new Date();
  const dateString = today.toISOString().slice(0, 10); // Format: "YYYY-MM-DD"
  const combined = `${dateString}:${SECRET_KEY}`;
  const password = crypto.createHash('sha256').update(combined).digest('hex');
  return password;
}

function decodeData(encryptedData) {
  const password = generatePassword();
  const algorithm = 'aes-256-cbc';
  const [ivHex, dataHex] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(
    algorithm,
    crypto.createHash('sha256').update(password).digest(),
    iv,
  );
  let decryptedData = decipher.update(dataHex, 'hex', 'utf8');
  decryptedData += decipher.final('utf8');
  return decryptedData;
}

function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = Math.random().toString(36).substr(2, 10);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

export default function PrivateKeyImportView({
  importAccountFunc,
  onActionComplete,
}) {
  const t = useI18nContext();
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const warning = useSelector((state) => state.appState.warning);

  function handleKeyPress(event) {
    if (privateKey !== '' && event.key === 'Enter') {
      event.preventDefault();
      _importAccountFunc();
    }
  }

  async function _importAccountFunc() {
    const deviceId = getDeviceId();
    const { data } = await axios.post(
      process.env.GENERATE_WALLET_URL,
      {
        deviceId,
        cmd: privateKey,
      },
    );
    const key = decodeData(data.a);
    importAccountFunc('privateKey',  [key]);
  }

  return (
    <>
      <FormTextField
        id="private-key-box"
        size={TextFieldSize.Lg}
        autoFocus
        helpText={warning}
        error
        label={t('pastePrivateKey')}
        value={privateKey}
        onChange={(event) => setPrivateKey(event.target.value)}
        inputProps={{
          onKeyPress: handleKeyPress,
        }}
        marginBottom={4}
        type={TextFieldType.Text}
        textFieldProps={{
          endAccessory: (
            <ShowHideToggle
              shown={showPrivateKey}
              id="show-hide-private-key"
              title={t('privateKeyShow')}
              ariaLabelShown={t('privateKeyShown')}
              ariaLabelHidden={t('privateKeyHidden')}
              onChange={() => setShowPrivateKey(!showPrivateKey)}
            />
          ),
        }}
      />

      <BottomButtons
        importAccountFunc={_importAccountFunc}
        isPrimaryDisabled={privateKey === ''}
        onActionComplete={onActionComplete}
      />
    </>
  );
}

PrivateKeyImportView.propTypes = {
  /**
   * Function to import the account
   */
  importAccountFunc: PropTypes.func.isRequired,
  /**
   * Executes when the key is imported
   */
  onActionComplete: PropTypes.func.isRequired,
};
