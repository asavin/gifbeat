class SoundsController < ApplicationController
    def getsound
        # register a client with YOUR_CLIENT_ID as client_id_
        client = Soundcloud.new(:client_id => '13801a472d3f0fcc41f7fcd1158253a4')
        # get 10 hottest tracks
        our_track = nil
        #while our_track == nil do
        #    logger.debug "hey11!"
            tracks = client.get('/tracks', :limit => 30, :order => 'hotness')
            logger.debug "Iteration done"
            tracks.each do |track|
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
        sound_url = ""
        #SoundCloud download url
        if(params[:sound_url])
            sound_url = params[:sound_url]
            url = params[:sound_url] + '?client_id=13801a472d3f0fcc41f7fcd1158253a4'
        elsif (params[:search_url])
            # assuming this is a SoundCloud track url
            # let's resolve this into a download url first
            client = Soundcloud.new(:client_id => '13801a472d3f0fcc41f7fcd1158253a4')
            logger.info params[:search_url]
            track = client.get('/resolve', :url => params[:search_url])
            sound_url = track.download_url
            url = sound_url.to_s + '?client_id=13801a472d3f0fcc41f7fcd1158253a4'    
        end
        
        
        
        # Before sending the request we can check from our db if this track is already analyzed
        if Track.find_by_source_id(sound_url).nil?
        
            response = HTTParty.post('http://developer.echonest.com/api/v4/track/upload', :body => { :url=> url, :api_key => 'TKHSBUNPSWPRLPUBK'})
            if(response.code == 200)
                json = JSON.parse(response.body)
                Track.create(:sound_id => json['response']['track']['id'], :source_id => sound_url)
            end
            respond_to do |format|
                format.json {
                    render json: response.body, :status => :ok
                }
            end
        else
            # We have already cached this request, cool!
            response = "This track is already analyzed!"
            respond_to do |format|
                format.json {
                    render json: response, :status => :created
                }
            end
        end
        
        #response = HTTParty.post('http://developer.echonest.com/api/v4/track/upload', :body => { :url=> 'http://api.soundcloud.com/tracks/69942117/download?client_id=13801a472d3f0fcc41f7fcd1158253a4', :api_key => 'TKHSBUNPSWPRLPUBK'})
    end
    
    def analyse_status
        track = Track.find_by_source_id(params[:sound_url])
        url = 'http://developer.echonest.com/api/v4/track/profile?' + 'api_key=TKHSBUNPSWPRLPUBK&id=' + track.sound_id
        response = HTTParty.get(url)
        
        respond_to do |format|
            format.json {
                render json: response.body
            }
        end
    end
    
    def tweets
        # Let's get sound profile from the EchoNest
        # but only if this was not done before
        track = Track.find_by_source_id(params[:sound_url])
        if track.nil? || track.mood_id.nil?
        
            url = 'http://developer.echonest.com/api/v4/track/profile?' + 'api_key=TKHSBUNPSWPRLPUBK&id=' + Track.last.sound_id + '&bucket=audio_summary'
            response = HTTParty.get(url)
            json = JSON.parse(response.body)
            
            # Here we do the mood mapping (TODO: move all this stuff to models)
            # First version very ugly hack mapping stuff
            
            case json['response']['track']['audio_summary']['energy']
                when 0..0.3
                    mood = 'sad'
                when 0.31..0.5
                    mood='relaxed'
                when 0.51..0.8
                    mood = 'happy'
                when 0.81..1
                    mood='excited'
                else
                    logger.debug "Not sure what's going on, value out of 0-1 range"
                    mood='indescribable'
            end
            
            track.mood_id = Mood.find_by_name(mood).id
            track.save
            
            logger.debug mood
        else
            mood = Mood.find(track.mood_id).name
        end
        
        # Now let's do some Twitter search based on the mood
        r = Twitter.search(mood, :count => 10)
        filtered = Array.new
        
        r.results.each do |tweet|
            unless tweet.user.location.empty?
                geo = Geocoder.search(tweet.user.location)
                unless geo.first.nil? || geo.first.geometry.nil?
                    logger.debug geo.first.geometry
                    hhhash = Hash[:text => tweet.text, :location => geo.first.geometry['location'], :place => tweet.user.location, :id => tweet.id]
                    filtered << hhhash
                end
                
            end
        end
        
        
        respond_to do |format|
            format.json {
                render json: filtered
            }
        end
        
    end
    
    def cached_sounds
        tracks = Track.all
        mood_sounds = Array.new
        
        tracks.each do |track|
            unless track.mood_id.nil?
                mood = Mood.find(track.mood_id).name
            end
            unless track.source_id.nil? || track.mood_id.nil?
                mood_sounds << Hash[:mood => mood, :download_url => track.source_id]
            end
        end
        
        respond_to do |format|
            format.json {
                render json: mood_sounds
            }
        end
    end

end
