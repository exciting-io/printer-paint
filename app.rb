require "rubygems"
require "bundler/setup"
require "sinatra"
require "data_mapper"
require "net/http"

DataMapper::setup(:default, ENV['SHARED_DATABASE_URL'] || "sqlite3://#{Dir.pwd}/wee-paint.db")

class Printer
  include DataMapper::Resource
  property :id, Serial
  property :url, Text
  property :nickname, String

  has n, :pictures
end

class Picture
  include DataMapper::Resource
  property :id, Serial
  property :from, String
  property :sent_at, DateTime
  property :image_data, Text

  belongs_to :printer
end

# Perform basic sanity checks and initialize all relationships
# Call this when you've defined all your models
DataMapper.finalize

# automatically create the post table
Printer.auto_upgrade!
Picture.auto_upgrade!

helpers do
  def send_picture(printer, picture_attributes)
    picture = printer.pictures.create!(picture_attributes)
    printer_url = URI.parse(printer.url)
    picture_url = url("/pictures/#{picture.id}")
    Net::HTTP.post_form(printer_url, url: picture_url)
    picture
  end
end

get "/" do
  erb :index
end

get "/register" do
  p url("/messages")
  erb :register
end

post "/register" do
  @printer = Printer.create!(params[:printer])
  erb :registered
end

get "/send/:nickname" do
  erb :send
end

post "/send/:nickname" do
  printer = Printer.first(nickname: params[:nickname])
  @picture = send_picture(printer, params[:picture].merge(sent_at: Time.now))
  erb :sent
end

get "/pictures/:id" do
  @picture = Picture.first(id: params[:id])
  erb :picture
end