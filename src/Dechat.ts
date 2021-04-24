import Session from "./Session.ts";

class Dechat {
  session: Session;

  constructor() {
    this.session = new Session();
    this.session.login();
  }
}

export default Dechat;
