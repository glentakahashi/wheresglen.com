TODO:
add sqlite3 database that keeps track of points
  create db if not exists
finish parse.js script to download your location history, and add new points if necessary

points:
  add points if you are in the same "locality" of a single place for more than 3 hours
  use the location, country, etc to name the point
  use the start and end dates of the first and last point
  another table with keeps track of the first date downloaded
