const fs = require('fs');
const request = require('superagent');
const FormData = require('form-data');

module.exports = (url, token, filePath) =>
  new Promise((resolve, reject) => {
    let file;
    try {
      file = fs.readFileSync(filePath);
    } catch (e) {
      return reject(e);
    }

    const form = new FormData();
    form.append('package', file);

    return request.post(url)
      .set({ Authorization: `Bearer ${token}` })
      .send(form)
      .then(resolve, reject);
  });
