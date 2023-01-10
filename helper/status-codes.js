const status = [
    {
      code: 100,
      message: "active",
    },
    {
      code: 101,
      message: "account is inactive by admin",
    },
    {
      code: 102,
      message: "account is inactive due missing confirmation",
    },
    {
      code: 103,
      message: "center inactive by admin",
    },
    {
      code: 104,
      message: "room inactive by admin",
    },
    {
      code: 105,
      message: "room inactive due to center inactivation",
    },
    {
      code: 106,
      message: "reserve inactive by admin",
    },
    {
      code: 107,
      message: "reserve inactive by user",
    },
    {
      code: 108,
      message: "reserve inactive due to room inactivation",
    },
    {
      code: 109,
      message: "reserve inactive due to account inactivation",
    },
  ];
  
  module.exports = status;
  