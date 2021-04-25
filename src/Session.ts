import { ky, printImage } from "./deps.ts";
import { Auth, User } from "./types/index.ts";
import { sleep } from "./utils/index.ts";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36",
  "client-version": "1.4.0",
  extspam:
    "Gp8ICJkIEpkICggwMDAwMDAwMRAGGoAI1GiJSIpeO1RZTq9QBKsRbPJdi84ropi16EYI10WB6g74sGmRwSNXjPQnYUKYotKkvLGpshucCaeWZMOylnc6o2AgDX9grhQQx7fm2DJRTyuNhUlwmEoWhjoG3F0ySAWUsEbH3bJMsEBwoB//0qmFJob74ffdaslqL+IrSy7LJ76/G5TkvNC+J0VQkpH1u3iJJs0uUYyLDzdBIQ6Ogd8LDQ3VKnJLm4g/uDLe+G7zzzkOPzCjXL+70naaQ9medzqmh+/SmaQ6uFWLDQLcRln++wBwoEibNpG4uOJvqXy+ql50DjlNchSuqLmeadFoo9/mDT0q3G7o/80P15ostktjb7h9bfNc+nZVSnUEJXbCjTeqS5UYuxn+HTS5nZsPVxJA2O5GdKCYK4x8lTTKShRstqPfbQpplfllx2fwXcSljuYi3YipPyS3GCAqf5A7aYYwJ7AvGqUiR2SsVQ9Nbp8MGHET1GxhifC692APj6SJxZD3i1drSYZPMMsS9rKAJTGz2FEupohtpf2tgXm6c16nDk/cw+C7K7me5j5PLHv55DFCS84b06AytZPdkFZLj7FHOkcFGJXitHkX5cgww7vuf6F3p0yM/W73SoXTx6GX4G6Hg2rYx3O/9VU2Uq8lvURB4qIbD9XQpzmyiFMaytMnqxcZJcoXCtfkTJ6pI7a92JpRUvdSitg967VUDUAQnCXCM/m0snRkR9LtoXAO1FUGpwlp1EfIdCZFPKNnXMeqev0j9W9ZrkEs9ZWcUEexSj5z+dKYQBhIICviYUQHVqBTZSNy22PlUIeDeIs11j7q4t8rD8LPvzAKWVqXE+5lS1JPZkjg4y5hfX1Dod3t96clFfwsvDP6xBSe1NBcoKbkyGxYK0UvPGtKQEE0Se2zAymYDv41klYE9s+rxp8e94/H8XhrL9oGm8KWb2RmYnAE7ry9gd6e8ZuBRIsISlJAE/e8y8xFmP031S6Lnaet6YXPsFpuFsdQs535IjcFd75hh6DNMBYhSfjv456cvhsb99+fRw/KVZLC3yzNSCbLSyo9d9BI45Plma6V8akURQA/qsaAzU0VyTIqZJkPDTzhuCl92vD2AD/QOhx6iwRSVPAxcRFZcWjgc2wCKh+uCYkTVbNQpB9B90YlNmI3fWTuUOUjwOzQRxJZj11NsimjOJ50qQwTTFj6qQvQ1a/I+MkTx5UO+yNHl718JWcR3AXGmv/aa9rD1eNP8ioTGlOZwPgmr2sor2iBpKTOrB83QgZXP+xRYkb4zVC+LoAXEoIa1+zArywlgREer7DLePukkU6wHTkuSaF+ge5Of1bXuU4i938WJHj0t3D8uQxkJvoFi/EYN/7u2P1zGRLV4dHVUsZMGCCtnO6BBigFMAA=",
  referer: "https://wx.qq.com/?&lang=zh_CN&target=t",
};

interface Auth {
  skey: string;
  passTicket: string;
  wxsid: string;
  wxuin: string;
  cookie: string;
}

interface User {
  User: {
    Uin: number;
    UserName: string;
    NickName: string;
    HeadImgUrl: string;
    Sex: number;
  };
  SyncKey: string;
}

class Session {
  auth?: Auth;
  prefixUrl = "";
  user?: User;
  syncKey?: string;

  genSyncKey(list: { Key: number; Val: number }[]) {
    return (this.syncKey = list.map((e) => `${e.Key}_${e.Val}`).join("|"));
  }

  async getCode() {
    const response = await ky.get("https://login.wx.qq.com/jslogin", {
      headers,
      searchParams: {
        appid: "wx782c26e4c19acffb",
        fun: "new",
        redirect_uri:
          "https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxnewloginpage?mod=desktop",
        lang: "zh_CN",
      },
    }).text();
    const code = response?.match(/[A-Za-z_\-\d]{10}==/)?.[0];
    if (!code) {
      throw new Error("get code fail");
    }
    return code;
  }

  displayQrcode(code: string) {
    const qrcodeUrl = `https://login.weixin.qq.com/qrcode/${code}`;
    printImage({ path: qrcodeUrl, width: 64 });
  }

  async checkCode(code: string): Promise<void> {
    var response = await ky.get(
      "https://login.wx.qq.com/cgi-bin/mmwebwx-bin/login",
      {
        timeout: 99999,
        searchParams: {
          loginicon: true,
          uuid: code,
          tip: 1,
          r: ~new Date(),
          _: +new Date(),
        },
        headers,
      },
    ).text();
    const statusCode = Number(response.match(/window.code=(\d+);/)?.[1]);

    if (statusCode !== 200) {
      return this.checkCode(code);
    }

    const authAddress = response.match(/window.redirect_uri="(.*?)";/)?.[1];

    this.prefixUrl = authAddress!.match(/^https:\/\/(.*?)\//)![0];

    const authResponse = await ky.get(`${authAddress}&fun=new&version=v2`, {
      headers: headers,
    });

    const authBody = await authResponse.text();
    const cookies = [] as string[];
    authResponse.headers.forEach((value, key) => {
      if (key === "set-cookie") {
        cookies.push(value.match(/^(.*?);/)![1]);
      }
    });

    try {
      this.auth = {
        cookie: cookies.join("; "),
        skey: authBody.match(/<skey>(.*?)<\/skey>/)![1]!,
        passTicket: authBody.match(/<pass_ticket>(.*?)<\/pass_ticket>/)![1],
        wxsid: authBody.match(/<wxsid>(.*?)<\/wxsid>/)![1],
        wxuin: authBody.match(/<wxuin>(.*?)<\/wxuin>/)![1],
      };
    } catch (_) {
      throw new Error("can not login with wechat web");
    }
  }

  async initUser() {
    if (!this.auth) {
      throw new Error("No login yet");
    }
    const user = await ky.post(
      `cgi-bin/mmwebwx-bin/webwxinit?r=${-new Date()}&pass_ticket=${this.auth.passTicket}`,
      {
        prefixUrl: this.prefixUrl,
        body: JSON.stringify({
          BaseRequest: {
            Sid: this.auth.wxsid,
            Uin: this.auth.wxuin,
            Skey: this.auth.skey,
          },
        }),
      },
    ).json();
    this.user = user as User;

    console.log(`${this.user?.User.NickName} have been logined`);
  }

  async keepalive() {
    if (!this.auth || !this.user) {
      throw new Error("no login yet");
    }

    const { SyncCheckKey } = await ky.post(`cgi-bin/mmwebwx-bin/webwxsync`, {
      headers: {
        cookie: this.auth.cookie,
      },
      prefixUrl: this.prefixUrl,
      searchParams: {
        sid: this.auth.wxsid,
        skey: this.auth.skey,
        lang: "en_US",
        pass_ticket: this.auth.passTicket,
      },
      body: JSON.stringify({
        BaseRequest: {
          Sid: this.auth.wxsid,
          Uin: this.auth.wxuin,
          Skey: this.auth.skey,
        },
        SyncKey: this.user.SyncKey,
        rr: ~new Date(),
      }),
    }).json();

    const host = this.prefixUrl.replace("//", "//webpush.");

    const loop = async (): Promise<void> => {
      var response = await ky.get(`cgi-bin/mmwebwx-bin/synccheck`, {
        prefixUrl: host,
        headers: {
          cookie: this.auth!.cookie,
        },
        searchParams: {
          r: +new Date(),
          sid: this.auth!.wxsid,
          uin: this.auth!.wxuin,
          skey: this.auth!.skey,
          synckey: this.syncKey!,
        },
      }).text();
      console.log(response);
      await sleep(30);
      return loop();
    };

    this.genSyncKey(SyncCheckKey.List);
    return loop();
  }

  async login() {
    const code = await this.getCode();
    this.displayQrcode(code);
    await this.checkCode(code);
    await this.initUser();
    this.keepalive();
  }
}

export default Session;
