/**
 Генерация и использование PassKey
 */

/**
 * Сначала импортируем сложные типы из нашего d.ts и даем им короткие имена
 * @typedef {import('./webauthn').PasskeyRequest} PasskeyRequest
 * @typedef {import('./webauthn').GeneratedPasskeyResult} GeneratedPasskeyResult
 * @typedef {import('./webauthn').AssertionResponse} AssertionResponse
 */

/**
 *
 * @param {import('@modules/misc/saved-data/source/sd.d.ts').SavedDataInstance} sd
 * @param {StringBundle | null} headers
 * @param {?string} name
 * @returns {PasskeyInstance}
 * @constructor
 */
function Passkey(sd, headers, name) {
    const apiUrl = "https://aapi.anybalance.ru/api/passkey/";
    if (!name) name = 'passkey';
    /** @type {GeneratedPasskeyResult} */
    let generatedPasskeyResult;
    /** @type {string} */
    let userHandle;

  /**
   *
   * @param {string} verb
   * @param {PasskeyRequest|LoginChallengeRequest} data
   * @returns {GeneratedPasskeyResult|AssertionResponse}
   */
    const callApi = (verb, data) => {
      const html = AnyBalance.requestPost(apiUrl + verb, JSON.stringify(data),
          addHeaders(headers, {'Content-Type': 'application/json'}));
      const json = JSON.parse(html);
      if(json.error)
          throw new AnyBalance.Error(`Ошибка ${verb}: ${json.message}`);
      return json;
    }
    /**
     *
     * @param {PasskeyRequest} data
     *
     * @returns {{attestationData: AttestationResponse}}
     */
    const generate = (data) => {
        userHandle = data.publicKey.user.id;
        generatedPasskeyResult = callApi('generate', data);
        AnyBalance.trace(`Сгенерирован Passkey ${name}`);
        return {attestationData: generatedPasskeyResult.attestationData};
    }

    /**
     * Сохраняет предварительно сгенерированный ключ
     */
    const saveGeneratedKey = () => {
        if(!generatedPasskeyResult)
            throw new AnyBalance.Error("No generated key found");
        sd.set(name, {
            key: generatedPasskeyResult,
            userHandle: userHandle,
            counter: 0
        });
        sd.save();
        AnyBalance.trace(`Сгенерированый Passkey ${name} сохранен`);
    }

    const clearKey = () => {
        sd.set(name);
        sd.save();
    }

    /**
     *
     * @param {LoginChallengeParams} _data
     * @returns {AssertionResponse}
     */
    const login = (_data) => {
        /** @type {LoginChallengeRequest} */
        const data = {
            publicKey: _data.publicKey,
            origin: _data.origin
        };

        /** @type {SavedKey} */
        const keyData = sd.get(name);
        if(!keyData)
            throw new AnyBalance.Error('Не найден passkey ' + name);

        data.credentialIdB64Url = keyData.key.attestationData.id;
        data.privateKeyHex = keyData.key.privateKeyHex;
        data.counter = _data.counter !== undefined ? _data.counter : ++keyData.counter;

        /** @type {AssertionResponse} */
        const result = callApi('login', data);
        result.response.userHandle = keyData.userHandle;

        //Сохраняем новый счетчик
        sd.set(name, keyData);
        sd.save();

        AnyBalance.trace(`Авторизован Passkey №${keyData.counter}`);

        return result;
    }

    const hasKey = () => {
        return !!sd.get(name);
    }

    return {
        generate,
        saveGeneratedKey,
        login,
        hasKey,
        clearKey
    }
}

