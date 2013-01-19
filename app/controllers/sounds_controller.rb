class SoundsController < ApplicationController
    def getsound
        # register a client with YOUR_CLIENT_ID as client_id_
        client = Soundcloud.new(:client_id => '13801a472d3f0fcc41f7fcd1158253a4')
        # get 10 hottest tracks
        our_track = nil
        #while our_track == nil do
        #    logger.debug "hey11!"
            tracks = client.get('/tracks', :limit => 100, :order => 'hotness')
            logger.debug "Iteration done"
            tracks.each do |track|
                logger.debug "hey!"
                if track.duration < 340000
                    if track.downloadable == true
                        our_track = track
                    end
                end
            end
        
       # end
        
    
        respond_to do |format|
            format.json {
                render json: our_track
            }
        end
    end
    
    def mood
        #SoundCloud download url
        url = params[:sound_url] + '?client_id=13801a472d3f0fcc41f7fcd1158253a4'
        response = HTTParty.post('http://developer.echonest.com/api/v4/track/upload', :body => { :url=> url, :api_key => 'TKHSBUNPSWPRLPUBK'})
        if(response.code == 200)
            json = JSON.parse(response.body)
            Track.create(:sound_id => json['response']['track']['id'])
        end
        respond_to do |format|
            format.json {
                render json: response.body
            }
        end
        
        
        #response = HTTParty.post('http://developer.echonest.com/api/v4/track/upload', :body => { :url=> 'http://api.soundcloud.com/tracks/69942117/download?client_id=13801a472d3f0fcc41f7fcd1158253a4', :api_key => 'TKHSBUNPSWPRLPUBK'})
    end
    
    def analyse_status
        # Using the latest track ID
        url = 'http://developer.echonest.com/api/v4/track/profile?' + 'api_key=TKHSBUNPSWPRLPUBK&id=' + Track.last.sound_id
        response = HTTParty.get(url)
        
        respond_to do |format|
            format.json {
                render json: response.body
            }
        end
    end
    
    def tweets
        # Let's get sound profile from the EchoNest
        url = 'http://developer.echonest.com/api/v4/track/profile?' + 'api_key=TKHSBUNPSWPRLPUBK&id=' + Track.last.sound_id + '&bucket=audio_summary'
        response = HTTParty.get(url)
        json = JSON.parse(response.body)
        
        # Here we do the mood mapping (TODO: move all this stuff to models)
        # First version very ugly hack mapping stuff
        
        case json['response']['track']['audio_summary']['energy']
            when 0..0.5
                mood = 'sad'
            when 0.51..1
                mood = 'happy'
            else
                logger.debug "Not sure what's going on, value out of 0-1 range"
                mood='indescribable'
        end
        
        logger.debug mood
        
        # Now let's do some Twitter search based on the mood
        r = Twitter.search(mood, :count => 20)
        filtered = Array.new
        
        r.results.each do |tweet|
            unless tweet.user.location.empty?
                geo = Geocoder.search(tweet.user.location)
                hhhash = Hash[:text => tweet.text, :location => geo.first.geometry['bounds']['northeast'], :id => tweet.id]
                filtered << hhhash
            end
        end
        
        
        respond_to do |format|
            format.json {
                render json: filtered
            }
        end
        
    end

end
