namespace my.bookshop;
entity Authors {
  key ID : Integer;
  name : String;
};

entity Books {
  key ID : Integer;
  title : String;
  author : Association to Authors;
  stock : Integer;
}

entity Orders {
  key ID  : Integer;
  book    : Association to Books;
  country : String;
  amount : Integer;
};
