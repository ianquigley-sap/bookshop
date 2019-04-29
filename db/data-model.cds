namespace my.bookshop;
entity Authors {
  key ID : String;
  firstName : String;
  lastName : String;
};

entity Books {
  key ID : String;
  title : String;
  author : Association to Authors;
  stock : Integer;
}

entity Orders {
  key ID  : String;
  book    : Association to Books;
  country : String;
  amount : Integer;
};
