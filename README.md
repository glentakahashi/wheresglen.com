TODO:
add sqlite3 database that keeps track of points
  create db if not exists
finish parse.js script to download your location history, and add new points if necessary

points:
  add points if you are in the same "locality" of a single place for more than 3 hours
  use the location, country, etc to name the point
  use the start and end dates of the first and last point
  another table with keeps track of the first date downloaded

three parts
1. Establish the major "trip" which just details overnight stays and identifies using a red line
  do this by seeing where I was on average between the hours of 10pm and 8am (OF THE TIME ZONE OF THE LOCATION) or something

2. Establish the activites/attractions visited from those places
  make these like "pins" on the map
3. Show the last 3 hours (or maybe 100 points) of detailed locations that I am in
4. Show images/facebook statuses/etc from the thing
5. Only do this if you are a facebook friend.
  make them "Log in with facebook" and use a backend api to determine if they are friends with my id
  only show the details/photos/statuses/last if they are friends with me

add controls to browse through my history

"multiple trips?"
Change color of lines based on estimated trip type (i.e. car, bike, plane, walk)
  use the end time of one point and the start time of another
