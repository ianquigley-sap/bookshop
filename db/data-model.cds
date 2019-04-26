namespace my.bookshop;
 

 
entity Authors {
  key ID : Integer;
  name   : String;
  books  : Association to many Books on books.author = $self;
}
 
 entity Books {
  key ID : Integer;
  title  : String;
  author : Association to Authors;
  stock  : Integer;
}

entity Orders  {
  key ID  : UUID;
  book    : Association to Books;
  country : String;
  amount  : Integer;
}
