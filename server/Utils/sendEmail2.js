const { CourierClient } = require("@trycourier/courier");

const API_KEY_COURIER = "pk_prod_R87VK9DSNYMHBBMNSNPTB3TH2GCD";

const courier = CourierClient({ authorizationToken: API_KEY_COURIER });

//send email using courier
const sendEmail2 = async (mailData) => {
  const { subject, receiverMail, html } = mailData;
  console.log(receiverMail);
  try {
    const { requestId } = await courier.send({
      message: {
        to: {
          email: receiverMail,
        },
        content: {
          title: subject,
          body: html,
        },
        routing: {
          method: "single",
          channels: ["email"],
        },
      },
    });
    console.log(requestId);
    console.log("Mail sent");
  } catch (err) {
    console.log("Error occured,", err);
  }
};

module.exports = sendEmail2;
